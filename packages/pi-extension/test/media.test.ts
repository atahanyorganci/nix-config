import { describe, expect, it } from "vitest";
import { headerArgs, mediaContentBlocks } from "../src/fetch-content/media.ts";
import type { FetchedMedia } from "../src/fetch-content/media.ts";

/**
 * Rendering is pure. Downloading is not tested here: it reaches live CDNs and
 * needs ffmpeg, so it is verified by hand against real posts instead.
 */
const base: FetchedMedia = { kind: "video", service: "bsky" };

describe("ffmpeg header arguments", () => {
	it("passes a user-agent through its own flag, not -headers", () => {
		// ffmpeg's HTTP layer sets its own user-agent after applying -headers,
		// so one smuggled in there is silently dropped.
		expect(headerArgs({ "user-agent": "Mozilla/5.0" })).toEqual(["-user_agent", "Mozilla/5.0"]);
	});

	it("terminates each other header with CRLF", () => {
		// -headers takes a single string of raw header lines; without the CRLF
		// ffmpeg treats the next one as a continuation.
		expect(headerArgs({ cookie: "a=1" })).toEqual(["-headers", "cookie: a=1\r\n"]);
		expect(headerArgs({ cookie: "a=1", referer: "https://x/" })).toEqual([
			"-headers",
			"cookie: a=1\r\nreferer: https://x/\r\n",
		]);
	});

	it("combines both forms", () => {
		expect(headerArgs({ "user-agent": "UA", cookie: "a=1" })).toEqual([
			"-user_agent",
			"UA",
			"-headers",
			"cookie: a=1\r\n",
		]);
	});

	it("adds nothing when a service returns no headers", () => {
		// A bare -headers with an empty value makes ffmpeg reject the input.
		expect(headerArgs({})).toEqual([]);
	});
});

describe("rendering", () => {
	it("returns an image block before its description for a photo", () => {
		// Order matters: pi forwards image blocks to the model directly, and a
		// caption after the image reads as a caption rather than a preamble.
		const blocks = mediaContentBlocks("https://bsky.app/p/1", {
			...base,
			kind: "photo",
			path: "/tmp/x/a.jpg",
			bytes: 1024,
			image: { data: "AAAA", mimeType: "image/jpeg" },
		});

		expect(blocks[0]).toEqual({ type: "image", data: "AAAA", mimeType: "image/jpeg" });
		expect(blocks[1]?.type).toBe("text");
		expect(blocks).toHaveLength(2);
	});

	it("says a video was not returned, only saved", () => {
		// Without this the model cannot tell whether it already has the
		// content and may answer as though it had watched the video.
		const [block] = mediaContentBlocks("https://bsky.app/p/2", {
			...base,
			kind: "hls",
			path: "/tmp/x/a.mp4",
			bytes: 18_501_319,
			seconds: 47,
		});

		expect(block?.type).toBe("text");
		const text = block?.type === "text" ? block.text : "";
		expect(text).toContain("/tmp/x/a.mp4");
		expect(text).toContain("17.6 MB");
		expect(text).toContain("47s");
		expect(text).toMatch(/not returned/i);
	});

	it("reports an error without pretending the media arrived", () => {
		const [block] = mediaContentBlocks("https://bsky.app/p/3", {
			...base,
			error: "Too long to download (1200s, limit 900s)",
		});

		const text = block?.type === "text" ? block.text : "";
		expect(text).toContain("Too long to download");
		expect(text).not.toMatch(/Saved to/);
	});

	it.each([
		[512, "512 B"],
		[2048, "2 KB"],
		[5_242_880, "5.0 MB"],
	])("formats %i bytes as %s", (bytes, expected) => {
		const [block] = mediaContentBlocks("https://bsky.app/p/4", { ...base, path: "/tmp/a", bytes });
		const text = block?.type === "text" ? block.text : "";
		expect(text).toContain(`Size: ${expected}`);
	});

	it("names the service, so the model can attribute the media", () => {
		const [block] = mediaContentBlocks("https://x.com/u/status/1", { ...base, service: "twitter" });
		const text = block?.type === "text" ? block.text : "";
		expect(text).toContain("Service: twitter");
	});
});
