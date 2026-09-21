import { execFile } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { extractText, getDocumentProxy, getMeta } from "unpdf";
import { createArtifactDir, normalizeImage } from "./image.ts";

/**
 * Reading PDFs.
 *
 * Text comes from unpdf, which is PDF.js packaged for a server. Embedded
 * images need poppler, because a PDF stores them as objects with no bearing on
 * the text stream and PDF.js offers no way out that does not involve rendering
 * whole pages.
 */

const run = promisify(execFile);

const PDFIMAGES = process.env.FETCH_CONTENT_PDFIMAGES ?? "pdfimages";

/**
 * Above either bound a PDF is written to disk instead of returned whole.
 *
 * Both are needed: a page count says nothing about how dense the pages are,
 * and a character count says nothing about how far a reader has to scroll.
 */
const INLINE_MAX_PAGES = 50;
const INLINE_MAX_CHARS = 50_000;

/** How much of a spilled document to show inline, as a taste of the rest. */
const SNIPPET_CHARS = 2_000;

/** Images smaller than this in either axis are scanning artefacts, not figures. */
const MIN_IMAGE_DIMENSION = 120;

export interface PdfImage {
	/** 1-based page the image was found on. */
	readonly page: number;
	readonly path: string;
	readonly width: number;
	readonly height: number;
}

export interface PdfResult {
	readonly title: string;
	readonly content: string;
	readonly pageCount: number;
	/** Set when the document was too large to return inline. */
	readonly artifactDir?: string;
	readonly images: readonly PdfImage[];
}

export interface PdfOptions {
	readonly includeImages?: boolean;
	readonly signal?: AbortSignal;
}

/** Section names and front-matter markers, which are never the title. */
const FRONT_MATTER_PATTERN =
	/^(?:abstract|introduction|contents|table of contents|draft|preprint|confidential|copyright|\(?[ivxlc]+\)?|page\b|\d+)\b|(?:arxiv:|doi:|issn|isbn)/i;

/**
 * Words that mark a line as part of a legal notice.
 *
 * Shape alone cannot catch these. "Provided proper attribution is provided,
 * Google hereby grants permission to" is capitalised and unpunctuated at the
 * end, so it looks exactly like a title; only its vocabulary gives it away.
 */
const LEGALESE_PATTERN =
	/\b(?:copyright|\(c\)|©|all rights reserved|licen[cs]ed?|permission|hereby|attribution|reproduce|redistribut|warrant|liabilit|creative commons|proprietary|trademark)\b/i;

/**
 * Find a title in the extracted text.
 *
 * The first line is rarely it. Papers open with a licence notice, reports with
 * a classification banner, scans with a page number. Those notices run across
 * several lines, so matching phrases line by line does not work: the middle of
 * Google's reproduction grant in "Attention Is All You Need" reads perfectly
 * innocuous on its own.
 *
 * What separates a title from prose is shape rather than wording. A title is a
 * standalone fragment: it does not end in sentence punctuation, and it does
 * not begin in lower case, because that only happens when a sentence is
 * already under way. Those two rules skip all three lines of that grant and
 * land on the fourth, which is the title.
 */
function titleFromText(text: string): string {
	for (const line of text.slice(0, 2000).split("\n")) {
		const trimmed = line.trim();
		// Long enough to be a title, short enough not to be a paragraph.
		if (trimmed.length < 8 || trimmed.length > 120) continue;
		if (FRONT_MATTER_PATTERN.test(trimmed)) continue;
		if (LEGALESE_PATTERN.test(trimmed)) continue;
		// Mid-sentence: the line continues something above it.
		if (/^[a-z]/.test(trimmed)) continue;
		// Prose: a title is a fragment, not a finished sentence.
		if (/[.!?;,:]$/.test(trimmed)) continue;
		// Mostly digits or punctuation, so a running header or a rule.
		if ((trimmed.match(/[A-Za-z]/g)?.length ?? 0) < trimmed.length / 2) continue;
		return trimmed;
	}
	return "";
}

/** The file name from a URL, as a last resort. */
function titleFromUrl(url: string): string {
	try {
		const name = new URL(url).pathname.split("/").filter(Boolean).at(-1);
		return name ? decodeURIComponent(name) : "";
	} catch {
		return "";
	}
}

/**
 * Pull the embedded images out of a PDF with poppler.
 *
 * `-p` puts the page number in each file name, which is the only link back to
 * where a figure appeared. Output is often a large lossless PNG, so each file
 * goes through the same resize and JPEG conversion as a fetched image.
 */
async function extractPdfImages(source: string, imageDir: string): Promise<PdfImage[]> {
	await mkdir(imageDir, { recursive: true });

	try {
		await run(PDFIMAGES, ["-png", "-p", source, join(imageDir, "img")]);
	} catch {
		// A PDF with no extractable images, an encrypted one, or a poppler that
		// is not installed: none of them are a reason to lose the text.
		return [];
	}

	const files = (await readdir(imageDir)).filter(name => name.endsWith(".png")).sort();
	const images: PdfImage[] = [];

	for (const name of files) {
		// pdfimages writes img-<page>-<index>.png.
		const page = Number(/img-(\d+)-/.exec(name)?.[1] ?? 0);
		const jpeg = join(imageDir, name.replace(/\.png$/, ".jpg"));
		const info = await normalizeImage(join(imageDir, name), jpeg);
		if (!info) continue;
		// Rules, gradients and scanning noise come out as slivers; a figure
		// does not.
		if (info.width < MIN_IMAGE_DIMENSION || info.height < MIN_IMAGE_DIMENSION) continue;
		images.push({ page, path: jpeg, width: info.width, height: info.height });
	}

	return images;
}

/** Describe a spilled document: where its parts are, and a taste of the text. */
function renderSummary(dir: string, pageCount: number, text: string, images: readonly PdfImage[]): string {
	const lines = [
		`${pageCount} pages, ${text.length.toLocaleString("en-US")} characters.`,
		"",
		"The document was too large to include in full. Its text was written to:",
		"",
		`  ${join(dir, "text.md")}`,
	];

	if (images.length > 0) {
		lines.push(
			"",
			`${images.length} embedded image(s), named by page, were written to:`,
			"",
			`  ${join(dir, "images")}`,
		);
	}

	lines.push(
		"",
		`The first ${SNIPPET_CHARS.toLocaleString("en-US")} characters follow; read the path above for the rest.`,
		"",
		"---",
		"",
		text.slice(0, SNIPPET_CHARS),
	);

	return lines.join("\n");
}

/**
 * Extract a PDF's text, and optionally its figures.
 *
 * A large document is written to a temporary directory rather than returned,
 * because a 460,000-character result crowds out everything else in a
 * conversation while being useless to read in one piece. The caller gets a
 * snippet and a path, which is enough to decide what to read next.
 */
export async function extractPdf(bytes: Uint8Array, url: string, options: PdfOptions = {}): Promise<PdfResult> {
	// PDF.js transfers the buffer to its worker, which detaches it: the array
	// is zero length once parsing starts, and the caller's copy goes with it.
	// Parsing a copy keeps the input intact and leaves the bytes available for
	// poppler, which needs the file on disk.
	const retained = Uint8Array.from(bytes);

	const pdf = await getDocumentProxy(Uint8Array.from(retained));

	// Metadata first where it exists: RFC 9110 declares its real title and
	// authors, which beats any guess made from the text. Plenty of documents
	// leave it blank, though, so it cannot be relied on alone.
	const declared = await getMeta(pdf)
		.then(meta => (meta.info as { Title?: string } | undefined)?.Title?.trim() ?? "")
		.catch(() => "");

	const { totalPages, text } = await extractText(pdf, { mergePages: true });
	options.signal?.throwIfAborted();

	const title = declared || titleFromText(text) || titleFromUrl(url);
	const oversized = totalPages > INLINE_MAX_PAGES || text.length > INLINE_MAX_CHARS;

	// A directory is needed for the images regardless, so it is only created
	// when something will actually be written into it.
	if (!oversized && !options.includeImages) {
		return { title, content: text, pageCount: totalPages, images: [] };
	}

	const dir = await createArtifactDir();
	await writeFile(join(dir, "text.md"), text);

	let images: PdfImage[] = [];
	if (options.includeImages) {
		const source = join(dir, "source.pdf");
		await writeFile(source, retained);
		images = await extractPdfImages(source, join(dir, "images"));
	}

	const body = oversized ? renderSummary(dir, totalPages, text, images) : text;
	const gallery =
		images.length > 0
			? `\n\n## Figures\n\n${images
					.map(image => `![page ${image.page}](${image.path})\n\n${image.width}x${image.height}, page ${image.page}`)
					.join("\n\n")}`
			: "";

	return { title, content: body + gallery, pageCount: totalPages, artifactDir: dir, images };
}
