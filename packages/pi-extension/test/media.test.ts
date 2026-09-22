import { describe, expect, it } from "vitest";
import { headerArgs, mediaKind, mediaResult } from "../src/fetch-content/media.ts";
import { toContentBlocks } from "../src/fetch-content/render.ts";
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
	const render = (url: string, media: FetchedMedia) => toContentBlocks(mediaResult(url, media));
	const textOf = (blocks: ReturnType<typeof render>) => blocks.map(b => (b.type === "text" ? b.text : "")).join("\n");

	it("returns an image block before its description for a photo", () => {
		// Order matters: pi forwards image blocks to the model directly, and a
		// caption after the image reads as a caption rather than a preamble.
		const blocks = render("https://bsky.app/p/1", {
			...base,
			kind: "image",
			path: "/tmp/x/a.jpg",
			bytes: 1024,
			image: {
				data: "AAAA",
				mimeType: "image/jpeg",
				width: 800,
				height: 600,
				originalFormat: "PNG",
				originalWidth: 1600,
				originalHeight: 1200,
			},
		});

		expect(blocks[0]).toEqual({ type: "image", data: "AAAA", mimeType: "image/jpeg" });
		expect(blocks[1]?.type).toBe("text");
		expect(blocks).toHaveLength(2);
	});

	it("reports a photo's dimensions, which are measured during normalization", () => {
		// A directly fetched image says how big it is; a cobalt photo used to
		// be the one result that could not, despite having the same numbers.
		const text = textOf(
			render("https://bsky.app/p/1", {
				...base,
				kind: "image",
				image: {
					data: "AAAA",
					mimeType: "image/jpeg",
					width: 1024,
					height: 768,
					originalFormat: "PNG",
					originalWidth: 2048,
					originalHeight: 1536,
				},
			}),
		);

		expect(text).toContain("PNG 2048x1536");
		expect(text).toContain("resized to 1024x768");
	});

	it("does not claim a resize when the image was already small enough", () => {
		const text = textOf(
			render("https://bsky.app/p/1", {
				...base,
				kind: "image",
				image: {
					data: "AAAA",
					mimeType: "image/jpeg",
					width: 640,
					height: 480,
					originalFormat: "JPEG",
					originalWidth: 640,
					originalHeight: 480,
				},
			}),
		);

		expect(text).toContain("JPEG 640x480");
		expect(text).not.toMatch(/resized/);
	});

	it("says a video was not returned, only saved", () => {
		// Without this the model cannot tell whether it already has the
		// content and may answer as though it had watched the video.
		const text = textOf(
			render("https://bsky.app/p/2", {
				...base,
				kind: "video",
				path: "/tmp/x/a.mp4",
				bytes: 18_501_319,
				seconds: 47,
			}),
		);

		expect(text).toContain("/tmp/x/a.mp4");
		expect(text).toContain("17.6 MB");
		expect(text).toContain("47s");
		expect(text).toMatch(/rather than returned/i);
		// The video arrived; only its bytes could not travel in the result. A
		// media fetch carries no text, which must not read as a failure.
		expect(text).not.toContain("Error:");
	});

	it("marks a truncated download as incomplete, so a path does not imply a whole file", () => {
		const text = textOf(
			render("https://bsky.app/p/2", {
				...base,
				kind: "video",
				path: "/tmp/x/a.mp4",
				bytes: 134_217_728,
				incomplete: true,
				error: "Stopped at the 128MB limit; the file is incomplete",
			}),
		);

		expect(text).toMatch(/incomplete/i);
	});

	it("reports an error without pretending the media arrived", () => {
		const text = textOf(
			render("https://bsky.app/p/3", {
				...base,
				error: "Too long to download (1200s, limit 900s)",
			}),
		);

		expect(text).toContain("Too long to download");
		expect(text).not.toMatch(/Saved to/);
	});

	it.each([
		[512, "512 B"],
		[2048, "2 KB"],
		[5_242_880, "5.0 MB"],
	])("formats %i bytes as %s", (bytes, expected) => {
		const text = textOf(render("https://bsky.app/p/4", { ...base, kind: "video", path: "/tmp/a", bytes }));
		expect(text).toContain(expected);
	});

	it("names the service, so the model can attribute the media", () => {
		const text = textOf(render("https://x.com/u/status/1", { ...base, service: "twitter" }));
		expect(text).toContain("Service: twitter");
	});

	it("attaches the source URL the same way every other result does", () => {
		// Media used to say "Media from <url>" while pages said "Source:",
		// which left the model with two phrasings for one idea.
		const text = textOf(render("https://x.com/u/status/1", { ...base, service: "twitter" }));
		expect(text).toContain("Source: https://x.com/u/status/1");
	});
});

describe("media kinds", () => {
	it.each([
		["photo", "image"],
		["video", "video"],
		["audio", "audio"],
		["hls", "video"],
		["merge", "video"],
	] as const)("reports cobalt's %s as %s", (delivery, expected) => {
		// hls and merge are ffmpeg strategies, not kinds of thing a reader can
		// hold an opinion about.
		expect(mediaKind(delivery)).toBe(expected);
	});

	it("never leaks a delivery strategy into the rendered output", () => {
		const blocks = toContentBlocks(mediaResult("https://x.com/u/1", { ...base, kind: mediaKind("hls") }));
		const text = blocks.map(b => (b.type === "text" ? b.text : "")).join("\n");
		expect(text).toContain("Type: video");
		expect(text).not.toMatch(/\bhls\b|\bmerge\b/);
	});
});
