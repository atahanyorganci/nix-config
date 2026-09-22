import { describe, expect, it } from "vitest";
import { facts, formatBytes, joinResults, renderResult, toContentBlocks } from "../src/fetch-content/render.ts";
import type { FetchResult } from "../src/fetch-content/render.ts";

/** Rendering is pure, so every case here is a value in and a string out. */
const base: FetchResult = { url: "https://example.com/a", title: "A Title", content: "Body text.", error: null };

describe("the envelope", () => {
	it("heads the result with its title", () => {
		expect(renderResult(base)).toMatch(/^# A Title\n/);
	});

	it("falls back to the URL when a page has no title", () => {
		// An empty heading reads as a missing result rather than an untitled
		// one, and the URL is the only other thing known for certain.
		expect(renderResult({ ...base, title: "" })).toMatch(/^# https:\/\/example\.com\/a\n/);
	});

	it("emits exactly one heading, so a provider cannot double it", () => {
		// GitHub pages used to build their own `# title` and then have the
		// renderer add a second one above it.
		const rendered = renderResult({ ...base, content: "## Description\n\nSomething." });
		expect(rendered.match(/^# /gm)).toHaveLength(1);
	});

	it("always attaches the source URL", () => {
		expect(renderResult(base)).toContain("Source: https://example.com/a");
	});
});

describe("facts", () => {
	it("prints each fact on its own line, in order", () => {
		const rendered = renderResult({
			...base,
			facts: [
				{ label: "Author", value: "dax" },
				{ label: "Pages", value: "50" },
			],
		});

		expect(rendered).toContain("Source: https://example.com/a\nAuthor: dax\nPages: 50");
	});

	it("omits a fact with no value rather than printing an empty label", () => {
		expect(facts({ label: "Author", value: "" }, { label: "Site", value: "   " })).toEqual([]);
	});

	it("keeps the first of a repeated label", () => {
		// Merging a media result with a page result can offer two of the same
		// label; the media's is built first and is the more specific.
		expect(facts({ label: "Type", value: "video" }, { label: "Type", value: "article" })).toEqual([
			{ label: "Type", value: "video" },
		]);
	});

	it("drops entries a provider left out entirely", () => {
		expect(facts(null, undefined, false, { label: "Words", value: "1,200" })).toEqual([
			{ label: "Words", value: "1,200" },
		]);
	});
});

describe("errors", () => {
	it("replaces the content when there is none", () => {
		const rendered = renderResult({ ...base, content: "", error: "HTTP 404" });
		expect(rendered).toContain("Error: HTTP 404");
	});

	it("rides alongside the content when there is some", () => {
		// A thin extraction is still worth returning: the caller gets both the
		// text and the doubt.
		const rendered = renderResult({ ...base, error: "Extracted content is unusually short" });
		expect(rendered).toContain("Note: Extracted content is unusually short");
		expect(rendered).toContain("Body text.");
		expect(rendered).not.toContain("Error:");
	});

	it("says something even when a provider reports no reason", () => {
		expect(renderResult({ ...base, content: "", error: null })).toContain("No content extracted");
	});

	it("does not call a media-only result empty", () => {
		// A video fetch carries no text by design: the attachment is the
		// result. Treating empty content as failure labelled every successful
		// video download an error.
		const rendered = renderResult({
			...base,
			content: "",
			attachments: [{ path: "/tmp/x/a.mp4", kind: "video", bytes: 1024 }],
		});

		expect(rendered).not.toContain("Error:");
		expect(rendered).toContain("/tmp/x/a.mp4");
	});

	it("does not call an image-only result empty", () => {
		const rendered = renderResult({
			...base,
			content: "",
			images: [{ type: "image", data: "AAAA", mimeType: "image/jpeg" }],
		});

		expect(rendered).not.toContain("Error:");
	});

	it("demotes a reason to a note when the media still arrived", () => {
		// A truncated download is a caveat about a file that exists, not a
		// failure to produce one.
		const rendered = renderResult({
			...base,
			content: "",
			error: "Stopped at the 128MB limit; the file is incomplete",
			attachments: [{ path: "/tmp/x/a.mp4", kind: "video", incomplete: true }],
		});

		expect(rendered).toContain("Note: Stopped at the 128MB limit");
		expect(rendered).not.toContain("Error:");
	});
});

describe("attachments", () => {
	it("lists a saved file with what it is and how big", () => {
		const rendered = renderResult({
			...base,
			attachments: [{ path: "/tmp/x/a.mp4", kind: "video", bytes: 18_501_319, seconds: 47 }],
		});

		expect(rendered).toContain("## Attachments");
		expect(rendered).toContain("- video (17.6 MB, 47s): /tmp/x/a.mp4");
	});

	it("says the files were not returned, so the model does not assume it has them", () => {
		const rendered = renderResult({
			...base,
			attachments: [{ path: "/tmp/x/a.mp4", kind: "video" }],
		});

		expect(rendered).toMatch(/rather than returned/i);
	});

	it("marks an incomplete file, since a path otherwise implies a whole one", () => {
		const rendered = renderResult({
			...base,
			attachments: [{ path: "/tmp/x/a.mp4", kind: "video", bytes: 134_217_728, incomplete: true }],
		});

		expect(rendered).toContain("incomplete");
	});

	it("omits the section when nothing was saved", () => {
		expect(renderResult(base)).not.toContain("## Attachments");
	});
});

describe("content blocks", () => {
	it("puts images before the text, so the text reads as a caption", () => {
		const blocks = toContentBlocks({
			...base,
			images: [{ type: "image", data: "AAAA", mimeType: "image/jpeg" }],
		});

		expect(blocks[0]?.type).toBe("image");
		expect(blocks[1]?.type).toBe("text");
	});

	it("returns a lone text block when there is no image", () => {
		expect(toContentBlocks(base)).toHaveLength(1);
	});

	it("separates several results with a rule", () => {
		const blocks = joinResults([base, { ...base, url: "https://example.com/b" }]);
		const text = blocks.map(block => (block.type === "text" ? block.text : "")).join("");
		expect(text).toContain("---");
		expect(text).toContain("https://example.com/b");
	});

	it("does not lead with a separator", () => {
		const [first] = joinResults([base]);
		expect(first?.type === "text" ? first.text : "").toMatch(/^# /);
	});

	it("keeps an image with its own result when several are joined", () => {
		// Flattened rather than string-joined: an image cannot be represented
		// in the text stream that separates the textual results.
		const blocks = joinResults([
			base,
			{ ...base, url: "https://example.com/b", images: [{ type: "image", data: "BBBB", mimeType: "image/jpeg" }] },
		]);

		expect(blocks.filter(block => block.type === "image")).toHaveLength(1);
	});
});

describe("byte formatting", () => {
	it.each([
		[512, "512 B"],
		[2048, "2 KB"],
		[5_242_880, "5.0 MB"],
		[18_501_319, "17.6 MB"],
	])("formats %i as %s", (bytes, expected) => {
		expect(formatBytes(bytes)).toBe(expected);
	});
});
