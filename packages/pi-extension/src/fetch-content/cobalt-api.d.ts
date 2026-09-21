/**
 * Types for the cobalt internals re-exported by `cobalt-api.js`.
 *
 * These describe observed behaviour rather than an upstream promise: cobalt
 * makes no compatibility guarantee about its internals.
 */

/**
 * One service extractor's result: the union of fields across all services,
 * which is why every field is optional.
 */
export interface CobaltServiceResult {
	error?: string;
	urls?: string | string[];
	/**
	 * Request headers the CDN requires. Several services hand back a session
	 * cookie or a specific user-agent that the media URL is only valid for;
	 * without them the download is refused with 403 even though the URL is
	 * still signed and unexpired.
	 */
	headers?: Record<string, string>;
	filename?: string;
	audioFilename?: string;
	isPhoto?: boolean;
	isAudioOnly?: boolean;
	isHLS?: boolean;
	type?: string;
	picker?: { url?: string; type?: string }[];
}

/**
 * Every service takes a different argument shape, so the input is deliberately
 * loose. The mapping that builds each one lives in `cobalt.ts`.
 */
export type CobaltService = (params: Record<string, unknown>) => Promise<CobaltServiceResult>;

/**
 * Canonicalise a URL: resolve host aliases and strip tracking parameters. Takes
 * a string and returns a URL, despite the name suggesting a round trip. Throws
 * on input that is not a URL at all.
 */
export function normalizeURL(url: string): URL;

/**
 * Identify the service behind a URL and pull out the fields its extractor
 * needs. Returns `{ error }` for anything unrecognised, so a falsy `host` is
 * the signal to fall through rather than an exception.
 */
/**
 * Per-service request headers, merged over a default user-agent.
 *
 * These are separate from the headers a service returns with its result: they
 * are what cobalt's own streaming layer adds when fetching the media. TikTok's
 * CDN needs the referer from here and the cookie from there, and refuses the
 * request without both.
 */
export function getHeaders(service: string): Record<string, string>;

export function extract(url: URL): {
	host?: string;
	patternMatch?: Record<string, unknown>;
	error?: string;
};

export const bilibili: CobaltService;
export const bluesky: CobaltService;
export const dailymotion: CobaltService;
export const facebook: CobaltService;
export const instagram: CobaltService;
export const loom: CobaltService;
export const newgrounds: CobaltService;
export const ok: CobaltService;
export const pinterest: CobaltService;
export const reddit: CobaltService;
export const rutube: CobaltService;
export const snapchat: CobaltService;
export const soundcloud: CobaltService;
export const streamable: CobaltService;
export const tiktok: CobaltService;
export const tumblr: CobaltService;
export const twitch: CobaltService;
export const twitter: CobaltService;
export const vimeo: CobaltService;
export const vk: CobaltService;
