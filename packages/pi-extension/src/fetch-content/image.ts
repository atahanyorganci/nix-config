import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

/**
 * Image handling, delegated to ImageMagick.
 *
 * Shelling out rather than using a native module keeps the extension a single
 * bundled file: sharp and its libvips would have to ship as a binary tree that
 * cannot be inlined.
 */

const run = promisify(execFile);

/**
 * Resolved from PATH, which the Nix module populates through
 * `programs.pi.extraPackages`. Bare names mean a plain checkout works too, as
 * long as ImageMagick is installed; the overrides exist for tests and for
 * pointing at a specific build.
 */
// Read at call time rather than at import: a constant captured when the
// module loads cannot be overridden afterwards.
const identify = () => process.env.FETCH_CONTENT_IDENTIFY ?? "identify";
const magick = () => process.env.FETCH_CONTENT_MAGICK ?? "magick";

/** Long edge of a normalized image, in pixels. */
export const DEFAULT_MAX_DIMENSION = 1024;
const DEFAULT_QUALITY = 82;

export interface ImageInfo {
	readonly format: string;
	readonly width: number;
	readonly height: number;
}

/** Content types ImageMagick is asked to handle. */
export const IMAGE_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/gif",
	"image/webp",
	"image/avif",
	"image/tiff",
	"image/bmp",
]);

/** Map a content type to a file extension, so ImageMagick can sniff by name. */
export function imageExtension(contentType: string): string {
	const type = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
	switch (type) {
		case "image/png":
			return ".png";
		case "image/gif":
			return ".gif";
		case "image/webp":
			return ".webp";
		case "image/avif":
			return ".avif";
		case "image/tiff":
			return ".tiff";
		case "image/bmp":
			return ".bmp";
		default:
			return ".jpg";
	}
}

/** Create a private directory for one fetch's artifacts. */
export async function createArtifactDir(): Promise<string> {
	return await mkdtemp(join(tmpdir(), "pi-fetch-"));
}

/**
 * Read an image's real format and dimensions.
 *
 * This validates as much as it describes. ImageMagick parses the header, so a
 * file whose content type lied fails here rather than reaching the model as
 * bytes it cannot decode — which it reports as an empty response rather than
 * an error, making the cause almost impossible to find from the outside.
 */
export async function identifyImage(path: string): Promise<ImageInfo | null> {
	try {
		// A multi-frame image (GIF, some TIFFs) prints one line per frame;
		// only the first matters here.
		const { stdout } = await run(identify(), ["-format", "%m %w %h\n", path]);
		const [format, width, height] = (stdout.split("\n")[0] ?? "").trim().split(/\s+/);
		if (!format || !width || !height) return null;
		const parsed = { format, width: Number(width), height: Number(height) };
		if (!Number.isFinite(parsed.width) || !Number.isFinite(parsed.height)) return null;
		if (parsed.width <= 0 || parsed.height <= 0) return null;
		return parsed;
	} catch {
		// A non-zero exit means ImageMagick could not make sense of the file.
		return null;
	}
}

export interface NormalizeOptions {
	readonly maxDimension?: number;
	readonly quality?: number;
}

/**
 * Fit an image inside a square bound and re-encode it as JPEG.
 *
 * The `>` on the geometry only shrinks, so a small image is passed through at
 * its original size rather than being upscaled into blur. Alpha is flattened
 * onto white first: JPEG has no transparency, and the default substitute is
 * black, which ruins logos and diagrams drawn for a light background.
 */
export async function normalizeImage(
	source: string,
	destination: string,
	options: NormalizeOptions = {},
): Promise<ImageInfo | null> {
	const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
	try {
		await run(magick(), [
			// Take the first frame: an animation would otherwise write one file
			// per frame and the destination path would not exist.
			`${source}[0]`,
			"-background",
			"white",
			"-alpha",
			"remove",
			"-alpha",
			"off",
			"-resize",
			`${maxDimension}x${maxDimension}>`,
			"-quality",
			String(options.quality ?? DEFAULT_QUALITY),
			// Drops EXIF, which can carry GPS coordinates and serves no purpose
			// once the image is being described rather than catalogued.
			"-strip",
			destination,
		]);
	} catch {
		return null;
	}
	return await identifyImage(destination);
}
