import { describe, expect, it } from "vitest";
import { isCobaltUrl } from "../src/fetch-content/cobalt.ts";

/**
 * Recognition is pure and offline. Actually resolving a post reaches the live
 * service, so it is left out: those calls fail for reasons that have nothing to
 * do with this code (geoblocks, paid tracks, deleted posts).
 */
describe("URL recognition", () => {
	it.each([
		"https://bsky.app/profile/avclub.com/post/3mviutosqmk2t",
		"https://vimeo.com/148751763",
		"https://soundcloud.com/artist/track",
		"https://www.tiktok.com/@nba/video/7443791391866260778",
		"https://www.reddit.com/r/videos/comments/abc123/title/",
		"https://www.instagram.com/p/Cabcdefghij/",
		"https://twitter.com/user/status/1234567890",
		"https://x.com/user/status/1234567890",
		"https://www.twitch.tv/user/clip/SomeClipName",
		"https://vk.com/video-1_2",
		"https://www.dailymotion.com/video/x8abcde",
		"https://streamable.com/abcdef",
		"https://www.loom.com/share/0123456789abcdef0123456789abcdef",
	])("recognises %s", url => {
		expect(isCobaltUrl(url)).toBe(true);
	});

	it.each([
		// Not a cobalt service.
		"https://example.com/page",
		"https://github.com/NixOS/nix",
		"https://en.wikipedia.org/wiki/Nix",
		// Cobalt parses these, but the service is deliberately unregistered:
		// YouTube is the only one needing isolated-vm, a native module that
		// cannot be bundled, and yt-dlp covers the same ground.
		"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
		"https://youtu.be/dQw4w9WgXcQ",
		"https://music.youtube.com/watch?v=dQw4w9WgXcQ",
	])("does not claim %s", url => {
		expect(isCobaltUrl(url)).toBe(false);
	});

	it.each(["", "not a url", "://missing-scheme", "ftp://files.example.com/a.mp4"])(
		"returns false rather than throwing for %o",
		url => {
			expect(() => isCobaltUrl(url)).not.toThrow();
			expect(isCobaltUrl(url)).toBe(false);
		},
	);

	it("normalises host aliases before matching", () => {
		// x.com and twitter.com reach the same extractor, which is cobalt's
		// aliasing rather than two registered services.
		expect(isCobaltUrl("https://x.com/user/status/1")).toBe(isCobaltUrl("https://twitter.com/user/status/1"));
	});

	it("requires a post path, not just a recognised host", () => {
		// A bare profile or homepage has no media to resolve, and cobalt's
		// patterns reject it. Without this the handler would claim URLs it
		// cannot do anything with, suppressing generic extraction.
		expect(isCobaltUrl("https://bsky.app")).toBe(false);
		expect(isCobaltUrl("https://bsky.app/profile/avclub.com")).toBe(false);
		expect(isCobaltUrl("https://soundcloud.com")).toBe(false);
	});
});

describe("result flattening", () => {
	it("carries the headers a service returns", async () => {
		// Cobalt returns these alongside the URLs because the two only work
		// together: TikTok's CDN answers 403 without the session cookie its
		// page handed out, even while the URL signature is still valid.
		const { toMedia } = await import("../src/fetch-content/cobalt.ts");
		const media = toMedia(
			{ urls: "https://cdn/v.mp4", filename: "v.mp4", headers: { cookie: "tt_chain_token=x" } },
			"tiktok",
		);
		// Merged with cobalt's per-service headers rather than replacing them.
		expect(media?.headers.cookie).toBe("tt_chain_token=x");
	});

	it("merges cobalt's per-service headers under the result's own", async () => {
		// TikTok's CDN checks the referer and the cookie independently:
		// either one alone still returns 403. The referer only exists in
		// cobalt's stream config, which a library consumer has to apply itself.
		const { toMedia } = await import("../src/fetch-content/cobalt.ts");
		const media = toMedia({ urls: "https://cdn/v.mp4", filename: "v.mp4" }, "tiktok");
		expect(media?.headers.referer).toBe("https://www.tiktok.com/");
		expect(media?.headers["user-agent"]).toMatch(/Mozilla/);
	});

	it("stringifies header values that are objects", async () => {
		// tiktok returns `cookie` as a Cookie instance with a toString, which
		// would otherwise be sent literally as "[object Object]".
		const { toMedia } = await import("../src/fetch-content/cobalt.ts");
		const cookie = { toString: () => "ttwid=abc" } as unknown as string;
		const media = toMedia({ urls: "https://cdn/v.mp4", filename: "v.mp4", headers: { cookie } }, "tiktok");
		expect(media?.headers.cookie).toBe("ttwid=abc");
	});
});
