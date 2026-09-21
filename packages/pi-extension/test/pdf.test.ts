import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractPdf } from "../src/fetch-content/pdf.ts";
import { makePdf } from "./helpers/pdf.ts";

/** Fixtures are written byte by byte, so the suite needs no renderer. */
const bytes = (pages: readonly (readonly string[])[]) => new Uint8Array(makePdf(pages));

const SMALL = [["Introduction to Widgets", "Widgets are useful things."]];

// The shape that defeats a purely structural heuristic: capitalised, with no
// terminal punctuation, and still not the title.
const LEGAL = [
	["Provided proper attribution is provided, Acme hereby grants permission", "A Study of Widgets", "Body text."],
];

const NUMBERED = [["1", "The Real Title", "Some content."]];

const LONG = Array.from({ length: 60 }, (_, index) => [
	`Page ${index + 1}`,
	...Array.from({ length: 12 }, () => "filler text on this line to add length"),
]);

describe("text extraction", () => {
	it("returns the text of a small document inline", async () => {
		const result = await extractPdf(bytes(SMALL), "https://example.com/small.pdf");
		expect(result.content).toContain("Widgets are useful things");
		// Inline means nothing was written to disk.
		expect(result.artifactDir).toBeUndefined();
	});

	it("reports the page count", async () => {
		const result = await extractPdf(bytes(LONG), "https://example.com/long.pdf");
		expect(result.pageCount).toBe(60);
	});

	it("leaves the caller's buffer usable", async () => {
		// PDF.js transfers the buffer to its worker and detaches it, which
		// would silently empty an array the caller still holds.
		const input = bytes(SMALL);
		await extractPdf(input, "https://example.com/small.pdf");
		expect(input.byteLength).toBeGreaterThan(0);
	});
});

describe("titles", () => {
	it("skips a legal notice that looks like a title", async () => {
		const result = await extractPdf(bytes(LEGAL), "https://example.com/legal.pdf");
		expect(result.title).toBe("A Study of Widgets");
	});

	it("skips a leading page number", async () => {
		const result = await extractPdf(bytes(NUMBERED), "https://example.com/numbered.pdf");
		expect(result.title).toBe("The Real Title");
	});

	it("falls back to the URL's file name when no line qualifies", async () => {
		const result = await extractPdf(bytes([["a.", "b.", "c."]]), "https://example.com/report-2024.pdf");
		expect(result.title).toBe("report-2024.pdf");
	});
});

describe("oversized documents", () => {
	it("spills a long document to disk instead of returning it whole", async () => {
		const result = await extractPdf(bytes(LONG), "https://example.com/long.pdf");
		expect(result.artifactDir).toBeTypeOf("string");
		expect(result.content).toContain("too large to include in full");
	});

	it("writes the full text where it says it did", async () => {
		const result = await extractPdf(bytes(LONG), "https://example.com/long.pdf");
		const written = await readFile(join(result.artifactDir!, "text.md"), "utf8");
		// The promise the summary makes: the file holds more than the snippet.
		expect(written.length).toBeGreaterThan(result.content.length);
	});

	it("keeps the snippet far smaller than the document", async () => {
		const result = await extractPdf(bytes(LONG), "https://example.com/long.pdf");
		const written = await readFile(join(result.artifactDir!, "text.md"), "utf8");
		expect(result.content.length).toBeLessThan(written.length / 2);
	});
});

describe("images", () => {
	it("returns no figures when they were not asked for", async () => {
		const result = await extractPdf(bytes(SMALL), "https://example.com/small.pdf");
		expect(result.images).toEqual([]);
	});

	it("survives a document poppler finds no images in", async () => {
		// A text-only PDF must still return its text rather than failing
		// because the image step came up empty.
		const result = await extractPdf(bytes(SMALL), "https://example.com/small.pdf", {
			includeImages: true,
		});
		expect(result.content).toContain("Widgets");
		expect(result.images).toEqual([]);
	});
});
