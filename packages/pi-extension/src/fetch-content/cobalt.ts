/**
 * Media links resolved through cobalt's extractors.
 *
 * Cobalt's service modules turn a post URL into the media behind it, which is
 * something generic extraction cannot do: a Bluesky post reduces to its alt
 * text, and a TikTok page to nothing at all. They are called in process here
 * rather than over HTTP, so no cobalt instance is involved.
 *
 * What comes back is URLs and metadata, never bytes. Photos are a single direct
 * link; video is often an HLS manifest or separate video and audio streams,
 * which need muxing before they are a file. That is left to the caller.
 */

// Cobalt has no type declarations and its `exports` field blocks every
// subpath but the server entry, so the untyped imports are confined to
// `cobalt-api.js`, which has a declaration file beside it.
import {
	extract,
	getHeaders,
	normalizeURL,
	bilibili,
	bluesky,
	dailymotion,
	facebook,
	instagram,
	loom,
	newgrounds,
	ok,
	pinterest,
	reddit,
	rutube,
	snapchat,
	soundcloud,
	streamable,
	tiktok,
	tumblr,
	twitch,
	twitter,
	vimeo,
	vk,
} from "./cobalt-api.js";
import type { CobaltService, CobaltServiceResult } from "./cobalt-api.js";

/** What cobalt returns, once the per-service shapes are flattened. */
export interface CobaltMedia {
	/**
	 * How the media is delivered, which decides what has to happen next.
	 *
	 * `photo` and `audio` are ready to use. `video` is a single file. `hls` is a
	 * manifest that has to be remuxed, and `merge` is separate video and audio
	 * streams that have to be muxed together.
	 */
	readonly kind: "photo" | "video" | "audio" | "hls" | "merge";
	readonly urls: readonly string[];
	/** Cobalt's suggested name, which carries the right extension. */
	readonly filename: string;
	/** Cobalt's service identifier, for attribution in the rendered output. */
	readonly service: string;
	/**
	 * Request headers the media URL is only served with.
	 *
	 * Two sources, and both are needed. The service result carries a session
	 * cookie tied to the signed URL; cobalt's stream config carries a
	 * per-service referer. TikTok's CDN checks the two independently --
	 * supplying either one alone still returns 403.
	 */
	readonly headers: Readonly<Record<string, string>>;
	/** Set when cobalt reports a duration it considers too long to serve. */
	readonly durationExceeded?: boolean;
}

/**
 * Per-service argument mapping, keyed by cobalt's own host identifier.
 *
 * This cannot be a single spread of the pattern match. The URL patterns capture
 * different names per service and several extractors expect derived or renamed
 * values: vimeo truncates its id, twitter shifts a 1-based index, pinterest
 * needs an explicit `false` rather than an absent key, and twitch renames
 * `clip` to `clipId`. Spreading blindly resolves Bluesky and fails the rest
 * with `fetch.fail` or `fetch.empty`.
 *
 * Quality and format defaults sit here too. Cobalt reads them from its server
 * config, which a library consumer does not have.
 */
const SERVICES: Record<string, { readonly fn: CobaltService; readonly args: (m: Match, url: URL) => Match }> = {
	bsky: { fn: bluesky, args: m => ({ ...m }) },
	bilibili: { fn: bilibili, args: m => ({ ...m }) },
	dailymotion: { fn: dailymotion, args: m => ({ ...m }) },
	facebook: { fn: facebook, args: m => ({ ...m }) },
	instagram: { fn: instagram, args: m => ({ ...m, quality: "1080" }) },
	loom: { fn: loom, args: m => ({ id: m.id }) },
	newgrounds: { fn: newgrounds, args: m => ({ ...m, quality: "1080" }) },
	ok: { fn: ok, args: m => ({ id: m.id, quality: "1080" }) },
	pinterest: {
		fn: pinterest,
		// An absent shortLink is not the same as a falsy one here.
		args: m => ({ id: m.id, shortLink: m.shortLink ?? false }),
	},
	reddit: { fn: reddit, args: m => ({ ...m }) },
	rutube: { fn: rutube, args: m => ({ ...m, quality: "1080" }) },
	snapchat: { fn: snapchat, args: m => ({ ...m }) },
	soundcloud: { fn: soundcloud, args: m => ({ ...m, format: "best" }) },
	streamable: { fn: streamable, args: m => ({ id: m.id, quality: "1080" }) },
	tiktok: { fn: tiktok, args: m => ({ postId: m.postId, shortLink: m.shortLink }) },
	tumblr: { fn: tumblr, args: (m, url) => ({ id: m.id, user: m.user, url }) },
	twitch: {
		fn: twitch,
		args: m => ({ clipId: m.clip ?? false, quality: "1080" }),
	},
	twitter: {
		fn: twitter,
		// Cobalt's pattern captures a 1-based media index; the service wants 0-based.
		args: m => ({
			id: m.id,
			index: typeof m.index === "string" ? Number(m.index) - 1 : undefined,
			toGif: false,
		}),
	},
	vimeo: {
		fn: vimeo,
		// Vimeo ids are capped at 11 characters upstream; longer captures are
		// private-link suffixes that the API rejects.
		args: m => ({
			id: typeof m.id === "string" ? m.id.slice(0, 11) : m.id,
			password: m.password,
			quality: "1080",
		}),
	},
	vk: {
		fn: vk,
		args: m => ({ ownerId: m.ownerId, videoId: m.videoId, accessKey: m.accessKey, quality: "1080" }),
	},
};

type Match = Record<string, unknown>;

/**
 * Cobalt's URL parser, which is the cheapest way to tell whether a URL is one
 * of its services at all. It also normalises shorteners and mobile hosts.
 *
 * YouTube is deliberately absent from SERVICES: it is the only service that
 * needs `isolated-vm`, a native module that cannot be bundled, and yt-dlp
 * covers the same ground. Cobalt will happily parse a YouTube URL, so the
 * lookup below is what excludes it.
 */
function parse(rawUrl: string): { host: string; match: Match; url: URL } | null {
	let url: URL;
	try {
		// normalizeURL takes a string and returns a URL, despite the name
		// suggesting a round trip.
		url = normalizeURL(rawUrl) as URL;
	} catch {
		return null;
	}

	const parsed = extract(url) as { host?: string; patternMatch?: Match; error?: string };
	if (parsed.error || !parsed.host || !parsed.patternMatch) return null;
	return { host: parsed.host, match: parsed.patternMatch, url };
}

/** True when cobalt recognises the URL and we are willing to resolve it. */
export function isCobaltUrl(rawUrl: string): boolean {
	const parsed = parse(rawUrl);
	return parsed !== null && parsed.host in SERVICES;
}

/**
 * Flatten one service result into the shape the caller renders.
 *
 * Cobalt signals delivery through a combination of `isPhoto`, `isHLS` and
 * `type`, and returns `urls` as either a string or an array depending on
 * whether muxing is needed. Normalising that here keeps the branching out of
 * the handler.
 */
export function toMedia(result: CobaltServiceResult, service: string): CobaltMedia | null {
	if (result.error) return null;

	// Carried through to every download. The service returns a cookie tied to
	// the signed URL, and cobalt applies a per-service referer in its own
	// streaming layer -- which a library consumer has to do for itself.
	//
	// Values are stringified because a service may return an object with a
	// toString rather than a string: tiktok's `cookie` is a Cookie instance,
	// which would otherwise be sent as "[object Object]".
	const headers = Object.fromEntries(
		Object.entries({ ...getHeaders(service), ...result.headers }).map(([name, value]) => [name, String(value)]),
	);

	// A picker is cobalt's answer for posts holding several items. Take the
	// images, which is the case that is useful without muxing.
	if (result.picker?.length) {
		const urls = result.picker.map(item => item.url).filter((u): u is string => Boolean(u));
		if (urls.length === 0) return null;
		return { kind: "photo", urls, filename: result.filename ?? "media", service, headers };
	}

	const urls = result.urls === undefined ? [] : Array.isArray(result.urls) ? result.urls : [result.urls];
	if (urls.length === 0) return null;

	const filename = result.filename ?? "media";
	if (result.isPhoto) return { kind: "photo", urls, filename, service, headers };
	if (result.isHLS) return { kind: "hls", urls, filename, service, headers };
	if (result.type === "merge" || urls.length > 1) return { kind: "merge", urls, filename, service, headers };
	if (result.isAudioOnly) return { kind: "audio", urls, filename, service, headers };
	return { kind: "video", urls, filename, service, headers };
}

/**
 * Resolve a post URL to the media behind it.
 *
 * Returns null when cobalt does not handle the URL, so callers can fall through
 * to generic extraction. A service that recognises the URL but cannot resolve it
 * returns null too, with the reason discarded: cobalt's error codes describe its
 * own API surface (`fetch.empty`, `content.post.unavailable`) and are not worth
 * surfacing to a model.
 */
export async function resolveMedia(rawUrl: string): Promise<CobaltMedia | null> {
	const parsed = parse(rawUrl);
	if (!parsed) return null;

	const service = SERVICES[parsed.host];
	if (!service) return null;

	// Several services mint a tunnel URL for part of their output, which reads
	// API_URL and throws on an empty one. Nothing contacts the address; it only
	// has to parse. Set rather than overwritten, so a real instance still wins.
	process.env.API_URL ??= "http://localhost:9000/";

	try {
		return toMedia(await service.fn(service.args(parsed.match, parsed.url)), parsed.host);
	} catch {
		// Extractors reach live sites and throw on anything unexpected there.
		// A failure to resolve is not a failure of the tool call.
		return null;
	}
}
