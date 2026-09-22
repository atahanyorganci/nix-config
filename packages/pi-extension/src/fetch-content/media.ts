import { execFile } from "node:child_process";
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { createArtifactDir, identifyImage, imageExtension, normalizeImage } from "./image.ts";
import { facts, formatBytes } from "./render.ts";
import { fetchRemoteUrl } from "./ssrf.ts";
import type { CobaltMedia } from "./cobalt.ts";
import type { FetchResult } from "./render.ts";

/**
 * Downloading what cobalt resolved.
 *
 * Photos become image blocks, which the model can read. Video and audio cannot
 * travel in a tool result, so they are written to a temp file and reported as a
 * path — useful to a caller who can then play, transcode or upload them.
 *
 * Video rarely arrives as a finished file. Cobalt returns HLS manifests and,
 * for some services, separate video and audio streams; both need ffmpeg. Every
 * ffmpeg call here is a stream copy, so nothing is re-encoded and the cost is
 * bounded by download speed rather than CPU.
 */

const run = promisify(execFile);

/**
 * Resolved from PATH, which the Nix module populates through
 * `programs.pi.extraPackages`. Read at call time rather than at import, so the
 * override is not captured before anything can set it.
 */
const ffmpeg = () => process.env.FETCH_CONTENT_FFMPEG ?? "ffmpeg";

/**
 * Ceilings, chosen because a 47-second clip already produced 18.5 MB.
 *
 * Both refuse rather than truncate: half a video file is worse than a message
 * saying it was too large, since the caller cannot tell the difference from a
 * path alone.
 */
const MAX_BYTES = 128 * 1024 * 1024;
const MAX_SECONDS = 15 * 60;

/** How long ffmpeg may run before it is assumed to be stuck on a slow origin. */
const FFMPEG_TIMEOUT_MS = 180_000;

/**
 * What the media is, in the terms a model can act on.
 *
 * Cobalt's own kind describes delivery -- `hls` is a manifest, `merge` is two
 * streams to mux -- which matters to ffmpeg and to nothing else. Reporting it
 * told the model that a TikTok video was an "hls", which is not a kind of
 * thing that exists to a reader.
 */
export type MediaKind = "image" | "video" | "audio";

/** Collapse cobalt's delivery strategy into what the file actually is. */
export function mediaKind(kind: CobaltMedia["kind"]): MediaKind {
	switch (kind) {
		case "photo":
			return "image";
		case "audio":
			return "audio";
		// video, hls and merge all end up as one playable video file.
		default:
			return "video";
	}
}

export interface FetchedMedia {
	readonly kind: MediaKind;
	readonly service: string;
	/** Where the file landed, or undefined when only an image block was produced. */
	readonly path?: string;
	readonly bytes?: number;
	readonly seconds?: number;
	/**
	 * Present for photos: the normalized image, ready to send to the model.
	 *
	 * The dimensions ride along because they are measured anyway during
	 * normalization, and without them a photo is the one result that cannot say
	 * how big it is -- a directly fetched image reports its size, and this did
	 * not.
	 */
	readonly image?: {
		readonly data: string;
		readonly mimeType: string;
		readonly width: number;
		readonly height: number;
		readonly originalFormat: string;
		readonly originalWidth: number;
		readonly originalHeight: number;
	};
	readonly error?: string;
	/** Set when the file on disk is a fragment, so a path does not imply a whole file. */
	readonly incomplete?: boolean;
}

/**
 * Render cobalt's headers as ffmpeg arguments.
 *
 * ffmpeg takes a user-agent through its own flag and everything else through
 * `-headers`, which expects one CRLF-terminated line per header. Splitting them
 * matters: passing a user-agent inside `-headers` is ignored, because the
 * protocol layer sets its own afterwards.
 *
 * These go before `-i`, since they configure the input that follows.
 */
export function headerArgs(headers: Readonly<Record<string, string>>): string[] {
	const args: string[] = [];
	const rest: string[] = [];

	for (const [name, value] of Object.entries(headers)) {
		if (name.toLowerCase() === "user-agent") args.push("-user_agent", value);
		else rest.push(`${name}: ${value}\r\n`);
	}

	if (rest.length > 0) args.push("-headers", rest.join(""));
	return args;
}

/** Strip anything that could escape the artifact directory. */
function safeName(filename: string): string {
	const base = filename.replace(/[/\\]/g, "_").replace(/^\.+/, "");
	return base.length > 0 ? base.slice(0, 120) : "media";
}

/**
 * Probe a remote stream for its duration, so an overlong one is refused before
 * anything is downloaded.
 *
 * Returns null when ffprobe cannot say — a live stream has no duration, and
 * some manifests omit it. That is treated as acceptable rather than fatal: the
 * byte ceiling still applies.
 */
async function probeSeconds(url: string, headers: Readonly<Record<string, string>>): Promise<number | null> {
	try {
		const { stdout } = await run(
			process.env.FETCH_CONTENT_FFPROBE ?? "ffprobe",
			// Same headers as the download: without them the probe is refused and
			// every duration check silently degrades to "unknown".
			["-v", "error", ...headerArgs(headers), "-show_entries", "format=duration", "-of", "csv=p=0", url],
			{ timeout: 30_000 },
		);
		const seconds = Number(stdout.trim().split("\n")[0]);
		return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
	} catch {
		return null;
	}
}

/**
 * Download a photo and normalize it through the existing image pipeline, so a
 * cobalt-resolved image gets the same validation, downscaling and EXIF
 * stripping as one found on a page.
 */
async function fetchPhoto(media: CobaltMedia, signal?: AbortSignal): Promise<FetchedMedia> {
	const kind = mediaKind(media.kind);
	const url = media.urls[0];
	if (!url) return { kind, service: media.service, error: "No image URL" };

	const response = await fetchRemoteUrl(url, {
		// Photo CDNs apply the same rule as video ones; Instagram and Snapchat
		// both refuse an image request that arrives without them.
		headers: media.headers,
		signal: signal ?? null,
	});
	if (!response.ok) {
		return { kind, service: media.service, error: `HTTP ${response.status}` };
	}

	const dir = await createArtifactDir();
	// Name the file by its declared type so ImageMagick can sniff it, rather
	// than trusting whatever extension cobalt's filename carried.
	const contentType = (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
	const path = join(dir, `source${imageExtension(contentType)}`);
	const bytes = Buffer.from(await response.arrayBuffer());
	await writeFile(path, bytes);

	// Validates as well as measures: a file whose content type lied fails here
	// rather than reaching the model as undecodable bytes, which it reports as
	// an empty response rather than an error.
	const info = await identifyImage(path);
	if (!info) {
		return { kind, service: media.service, path, bytes: bytes.length, error: "Not a decodable image" };
	}

	// Downscales, flattens transparency and strips EXIF, writing a JPEG beside
	// the original; the base64 the model receives is read back from it.
	const normalizedPath = join(dir, `${safeName(media.filename).replace(/\.[^.]*$/, "")}.jpg`);
	const normalized = await normalizeImage(path, normalizedPath);
	if (!normalized) {
		return { kind, service: media.service, path, bytes: bytes.length, error: "Could not normalize image" };
	}

	return {
		kind,
		service: media.service,
		path: normalizedPath,
		bytes: bytes.length,
		image: {
			data: (await readFile(normalizedPath)).toString("base64"),
			mimeType: "image/jpeg",
			width: normalized.width,
			height: normalized.height,
			originalFormat: info.format,
			originalWidth: info.width,
			originalHeight: info.height,
		},
	};
}

/**
 * Remux or mux a stream into a playable file.
 *
 * A `merge` result is separate video and audio; the explicit maps pick the
 * first stream of each rather than letting ffmpeg guess.
 *
 * Note that `-bsf:a aac_adtstoasc` is deliberately absent. It is the usual
 * advice for HLS into MP4, but ffmpeg inserts it automatically when required:
 * remuxing the same manifest with and without it produced byte-identical files
 * (matching md5). Passing it explicitly only removes the automatic choice, and
 * it is fatal on a stream that is not AAC -- "Codec 'mp3' is not supported by
 * the bitstream filter" aborts the whole remux.
 */
async function remux(media: CobaltMedia, signal?: AbortSignal): Promise<FetchedMedia> {
	const kind = mediaKind(media.kind);
	const seconds = await probeSeconds(media.urls[0] ?? "", media.headers);
	if (seconds !== null && seconds > MAX_SECONDS) {
		return {
			kind,
			service: media.service,
			seconds,
			error: `Too long to download (${Math.round(seconds)}s, limit ${MAX_SECONDS}s)`,
		};
	}

	const dir = await createArtifactDir();
	const path = join(dir, safeName(media.filename));

	// Repeated per input: ffmpeg scopes these to the `-i` that follows them, so
	// a `merge` result needs them in front of both the video and the audio URL.
	const inputs = media.urls.flatMap(url => [...headerArgs(media.headers), "-i", url]);
	const mapping = media.kind === "merge" ? ["-map", "0:v:0", "-map", "1:a:0"] : [];
	const args = [
		"-loglevel",
		"error",
		"-y",
		...inputs,
		"-c",
		"copy",
		...mapping,
		// Refuse rather than truncate, so a path always means a complete file.
		"-fs",
		String(MAX_BYTES),
		path,
	];

	try {
		await run(ffmpeg(), args, { timeout: FFMPEG_TIMEOUT_MS, signal });
	} catch (error) {
		const reason = error instanceof Error ? error.message.split("\n")[0] : String(error);
		return { kind, service: media.service, error: `ffmpeg failed: ${reason}` };
	}

	const { size } = await stat(path);
	if (size >= MAX_BYTES) {
		return {
			kind,
			service: media.service,
			path,
			bytes: size,
			incomplete: true,
			error: `Stopped at the ${Math.round(MAX_BYTES / 1024 / 1024)}MB limit; the file is incomplete`,
		};
	}

	return {
		kind,
		service: media.service,
		path,
		bytes: size,
		...(seconds === null ? {} : { seconds }),
	};
}

/** Download whatever cobalt resolved, choosing a strategy from its kind. */
export async function fetchMedia(media: CobaltMedia, signal?: AbortSignal): Promise<FetchedMedia> {
	try {
		if (media.kind === "photo") return await fetchPhoto(media, signal);
		return await remux(media, signal);
	} catch (error) {
		// A failed download is a result, not an exception: the caller may have
		// asked for several URLs and the others can still succeed.
		return {
			kind: mediaKind(media.kind),
			service: media.service,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/** Describe a normalized image the way the direct-image path does. */
function describeImage(image: NonNullable<FetchedMedia["image"]>): string {
	const original = `${image.originalFormat} ${image.originalWidth}x${image.originalHeight}`;
	const unchanged = image.width === image.originalWidth && image.height === image.originalHeight;
	return unchanged ? original : `${original}, resized to ${image.width}x${image.height}`;
}

/**
 * Describe fetched media as a result, leaving presentation to the renderer.
 *
 * A photo becomes an image block, which pi passes to the model directly.
 * Video and audio cannot travel in a tool result, so they become attachments:
 * a path the caller can play, transcode or upload.
 */
export function mediaResult(url: string, media: FetchedMedia): FetchResult {
	const image = media.image;

	return {
		url,
		title: "",
		// The media is the content; anything said about it belongs in the facts.
		content: "",
		error: media.error ?? null,
		facts: facts(
			{ label: "Service", value: media.service },
			{ label: "Type", value: media.kind },
			image ? { label: "Image", value: describeImage(image) } : null,
			// An image is returned inline, so its path is a note rather than the
			// point; a video's path is the only way to reach it and is an
			// attachment instead.
			image && media.path ? { label: "Saved to", value: media.path } : null,
			image && media.bytes !== undefined ? { label: "Size", value: formatBytes(media.bytes) } : null,
		),
		...(image ? { images: [{ type: "image" as const, data: image.data, mimeType: image.mimeType }] } : {}),
		...(!image && media.path
			? {
					attachments: [
						{
							path: media.path,
							kind: media.kind,
							...(media.bytes === undefined ? {} : { bytes: media.bytes }),
							...(media.seconds === undefined ? {} : { seconds: media.seconds }),
							...(media.incomplete ? { incomplete: true } : {}),
						},
					],
				}
			: {}),
	};
}
