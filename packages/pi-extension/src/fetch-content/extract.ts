import { Defuddle } from "defuddle/node";
import { parseHTML } from "linkedom";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchGithubPage, isGithubUrl, matchRoute, rawUrlFor } from "./handlers/github.ts";
import { parseOpenGraph, preferMetadata, prefersMetadata, renderOpenGraph } from "./handlers/opengraph.ts";
import { createArtifactDir, identifyImage, imageExtension, IMAGE_TYPES, normalizeImage } from "./image.ts";
import { collectPageImages, DEFAULT_IMAGE_LIMIT } from "./page-images.ts";
import { extractPdf } from "./pdf.ts";
import { fetchRemoteUrl } from "./ssrf.ts";
import type { FetchRemoteOptions } from "./ssrf.ts";

/**
 * Turns a URL into readable markdown.
 *
 * Extraction is Defuddle's job: it finds the article within a page and emits
 * markdown directly, so no separate HTML-to-markdown step is needed.
 */

export interface ExtractOptions extends FetchRemoteOptions {
	readonly signal?: AbortSignal;
	readonly timeoutMs?: number;
	readonly maxBytes?: number;
	/**
	 * Download the images a page contains. Off by default: a page can
	 * reference dozens, each costing a request and a conversion, so the cost is
	 * only worth paying when the figures are the point of the fetch.
	 */
	readonly includeImages?: boolean;
	readonly imageLimit?: number;
}

/** A fetched image, normalized and ready to hand to the model. */
export interface ExtractedImage {
	/** Where the normalized file was written, for later reference. */
	readonly path: string;
	readonly mimeType: string;
	/** Base64, no data: prefix, as pi's ImageContent expects. */
	readonly data: string;
	readonly width: number;
	readonly height: number;
	readonly originalFormat: string;
	readonly originalWidth: number;
	readonly originalHeight: number;
}

export interface ExtractedContent {
	readonly url: string;
	readonly title: string;
	readonly content: string;
	/** Null on success; a human-readable reason otherwise. */
	readonly error: string | null;
	readonly author?: string;
	readonly published?: string;
	readonly wordCount?: number;
	readonly siteName?: string;
	/** Set when the URL was an image rather than a document. */
	readonly image?: ExtractedImage;
	/** Images found on the page, present only when they were requested. */
	readonly images?: readonly PageImageResult[];
	/** Page count, for documents that have pages. */
	readonly pageCount?: number;
	/** Directory holding the extracted parts of an oversized document. */
	readonly artifactDir?: string;
}

/** An image downloaded from within a page, keyed back to where it came from. */
export interface PageImageResult {
	readonly src: string;
	readonly alt: string;
	readonly path: string;
	readonly width: number;
	readonly height: number;
}

export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Below this, extraction technically succeeded but almost certainly lost the
 * page. It is reported as a warning rather than an error, because a genuinely
 * short page is indistinguishable from a botched extraction by length alone.
 */
const THIN_CONTENT_CHARS = 500;

/**
 * How a response body should be turned into content.
 *
 * The distinction matters: markup goes to the extractor, while plain text is
 * already the content and only needs passing through. Feeding text to an HTML
 * parser produces an empty document at best, and on a raw markdown file it
 * throws outright.
 */
type ContentKind = "markup" | "text" | "image" | "pdf" | "unsupported";

export function classifyContentType(contentType: string): ContentKind {
	const type = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
	if (type === "text/html" || type === "application/xhtml+xml") return "markup";
	if (type === "application/pdf") return "pdf";
	if (IMAGE_TYPES.has(type)) return "image";
	// SVG is markup, but as a drawing it is only useful rendered, and the
	// extractor would return its text nodes stripped of the shapes.
	if (type === "image/svg+xml") return "image";
	if (type === "text/xml" || type === "application/xml" || type.endsWith("+xml")) return "markup";
	if (type === "text/plain" || type === "text/markdown" || type === "application/json") return "text";
	// Everything else under text/* is source code, CSV, config and the like:
	// readable as-is, and nothing an HTML extractor should touch.
	if (type.startsWith("text/")) return "text";
	return "unsupported";
}

/**
 * Resolve the body's character encoding from the Content-Type header.
 *
 * Defaulting to UTF-8 mis-decodes older and non-English pages: latin-1 bytes
 * for "Café" come out as "Caf\uFFFD" and the damage is irreversible by the time
 * the text reaches the extractor.
 */
function charsetFrom(contentType: string): string {
	return /charset\s*=\s*["']?([^;"'\s]+)/i.exec(contentType)?.[1] ?? "utf-8";
}

/** Decode bytes with `charset`, falling back to UTF-8 when the label is unknown. */
function decodeBody(bytes: Uint8Array, charset: string): string {
	try {
		return new TextDecoder(charset).decode(bytes);
	} catch {
		// TextDecoder throws on labels it does not implement; a mojibake UTF-8
		// reading still beats failing the whole fetch.
		return new TextDecoder("utf-8").decode(bytes);
	}
}

/**
 * Heuristic for pages whose body arrives empty and is filled in by script.
 * Worth distinguishing because the fix differs: a JS-rendered page needs a
 * browser, while an unparseable one needs a different extractor.
 */
function isLikelyJsRendered(html: string): boolean {
	const hasAppRoot = /<(?:div|main)[^>]+id=["'](?:root|app|__next|__nuxt)["']/i.test(html);
	const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
	const bodyText =
		bodyMatch?.[1]
			?.replace(/<script[\s\S]*?<\/script>/gi, "")
			.replace(/<[^>]+>/g, "")
			.trim() ?? "";
	return hasAppRoot && bodyText.length < THIN_CONTENT_CHARS;
}

/** Format a byte count for an error message, without rounding small limits to 0. */
function formatBytes(bytes: number): string {
	if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)}MB`;
	if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
	return `${bytes} bytes`;
}

/**
 * Read a response body into bytes, refusing to buffer more than `maxBytes`.
 *
 * Decoding is left to the caller because the character set comes from the
 * headers, and a streaming decoder would have to commit to one before the
 * body is known to be within budget.
 */
async function readBytesWithLimit(response: Response, maxBytes: number): Promise<Uint8Array> {
	// Trust Content-Length when present to avoid streaming a huge body at all.
	const declared = Number(response.headers.get("content-length") ?? Number.NaN);
	if (Number.isFinite(declared) && declared > maxBytes) {
		throw new Error(`Response exceeds ${formatBytes(maxBytes)} limit`);
	}

	const body = response.body;
	if (!body) return new Uint8Array();

	const reader = body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > maxBytes) {
				throw new Error(`Response exceeds ${formatBytes(maxBytes)} limit`);
			}
			chunks.push(value);
		}
	} finally {
		await reader.cancel().catch(() => {});
	}

	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}

/**
 * Derive a title for a body that has no markup to carry one.
 *
 * A leading markdown heading is the best available answer; otherwise the file
 * name from the URL beats both an empty title and an arbitrary first line.
 */
function textTitle(text: string, url: string): string {
	const heading = /^#{1,6}\s+(.+)$/m.exec(text.slice(0, 2000))?.[1]?.trim();
	if (heading) return heading;
	try {
		const { pathname } = new URL(url);
		const name = pathname.split("/").filter(Boolean).at(-1);
		if (name) return decodeURIComponent(name);
	} catch {
		// Fall through to the empty title below.
	}
	return "";
}

/**
 * Explain an HTTP failure, and where possible say what to do about it.
 *
 * A bare status line tells the caller the fetch failed but not whether trying
 * something else could succeed. A missing page is the case worth spelling out:
 * it usually existed once, so searching for its current address and retrying
 * is a real option rather than a guess.
 */
function httpErrorMessage(status: number, statusText: string): string {
	const base = `HTTP ${status}${statusText ? `: ${statusText}` : ""}`;
	if (status === 404 || status === 410) {
		return (
			`${base}. The origin server says this page does not exist, so it cannot be fetched. ` +
			`It may have moved or been renamed: search for the current URL, then retry with it.`
		);
	}
	if (status === 429) {
		return `${base}. The origin is rate limiting this client, so retrying immediately will fail the same way.`;
	}
	if (status === 401 || status === 403) {
		return `${base}. The page exists but is not public, and this tool sends no credentials.`;
	}
	if (status >= 500) {
		return `${base}. This is a fault on the origin server, not in the request.`;
	}
	return base;
}

function errorMessage(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

function failure(url: string, error: string): ExtractedContent {
	return { url, title: "", content: "", error };
}

/**
 * Turn an image response into something the model can look at.
 *
 * The bytes are written before being inspected because ImageMagick reads a
 * path, and that inspection is the point: a content type is a claim, and a
 * server that mislabels an HTML error page as a PNG would otherwise produce a
 * silently empty answer from the provider rather than an error.
 */
async function extractImage(
	url: string,
	response: Response,
	contentType: string,
	maxBytes: number,
): Promise<ExtractedContent> {
	const bytes = await readBytesWithLimit(response, maxBytes);
	if (bytes.byteLength === 0) return failure(url, "Response body is empty");

	const dir = await createArtifactDir();
	const original = join(dir, `source${imageExtension(contentType)}`);
	await writeFile(original, bytes);

	const info = await identifyImage(original);
	if (!info) {
		return failure(url, `Response is labelled ${contentType} but is not a decodable image`);
	}

	const normalizedPath = join(dir, "image.jpg");
	const normalized = await normalizeImage(original, normalizedPath);
	if (!normalized) return failure(url, "Image could not be converted for display");

	return {
		url,
		title: textTitle("", url),
		content: "",
		error: null,
		image: {
			path: normalizedPath,
			mimeType: "image/jpeg",
			data: (await readFile(normalizedPath)).toString("base64"),
			width: normalized.width,
			height: normalized.height,
			originalFormat: info.format,
			originalWidth: info.width,
			originalHeight: info.height,
		},
	};
}

/**
 * Download the images a page referenced, discarding the ones that fail.
 *
 * A broken or hotlink-protected image is normal on a page of any age, so one
 * failure must not cost the article it belongs to. The downloads share a
 * single directory, which keeps one page's artifacts together.
 */
async function downloadPageImages(
	images: readonly { src: string; alt: string }[],
	options: ExtractOptions,
): Promise<PageImageResult[]> {
	if (images.length === 0) return [];

	const dir = await createArtifactDir();
	const results: PageImageResult[] = [];

	for (const [index, image] of images.entries()) {
		if (options.signal?.aborted) break;
		try {
			const response = await fetchRemoteUrl(
				image.src,
				{
					...(options.signal ? { signal: options.signal } : {}),
					headers: { Accept: "image/*" },
				},
				options,
			);
			if (!response.ok) continue;

			const contentType = response.headers.get("content-type") ?? "";
			const bytes = await readBytesWithLimit(response, options.maxBytes ?? DEFAULT_MAX_BYTES);
			if (bytes.byteLength === 0) continue;

			const source = join(dir, `image-${index}${imageExtension(contentType)}`);
			await writeFile(source, bytes);

			// The same validation as a directly fetched image: a page linking to
			// an error page is the common case, not an unusual one.
			const destination = join(dir, `image-${index}.jpg`);
			const info = await normalizeImage(source, destination);
			if (!info) continue;

			results.push({ src: image.src, alt: image.alt, path: destination, ...info });
		} catch {
			// One unreachable image is not a reason to fail the page.
			continue;
		}
	}

	return results;
}

/**
 * List downloaded images beneath the article text.
 *
 * They are appended rather than spliced into place: the extractor's markdown
 * does not preserve where each image sat in the original document, and an
 * inaccurate position is worse than an honest list at the end.
 */
function appendImageGallery(content: string, images: readonly PageImageResult[]): string {
	if (images.length === 0) return content;
	const entries = images.map(image => {
		const caption = image.alt || "image";
		return `![${caption}](${image.path})\n\n${image.width}x${image.height} — from ${image.src}`;
	});
	return `${content}\n\n## Images\n\n${entries.join("\n\n")}`;
}

/**
 * Fetch one URL and extract its readable content.
 *
 * Every failure is returned rather than thrown: a batch of URLs should report
 * per-URL outcomes instead of losing the successful ones to a single error.
 */
export async function extractContent(url: string, options: ExtractOptions = {}): Promise<ExtractedContent> {
	if (options.signal?.aborted) return failure(url, "Aborted");

	const handled = await handleGithubUrl(url, options);
	if (handled) return handled;

	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

	// One controller for both the caller's signal and the timeout, so whichever
	// fires first aborts the in-flight request.
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	const onAbort = () => controller.abort();
	options.signal?.addEventListener("abort", onAbort, { once: true });

	try {
		const response = await fetchRemoteUrl(
			url,
			{
				signal: controller.signal,
				headers: {
					// A plain, honest identifier. Sites that block it would equally
					// block a spoofed one once they look past the header.
					"User-Agent": "pi-fetch-content/1.0 (+https://github.com/atahanyorganci/nix-config)",
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
					"Accept-Language": "en-US,en;q=0.9",
				},
			},
			options,
		);

		if (!response.ok) {
			return failure(url, httpErrorMessage(response.status, response.statusText));
		}

		const contentType = response.headers.get("content-type") ?? "";
		const kind = classifyContentType(contentType);
		if (kind === "unsupported") {
			return failure(url, `Unsupported content type: ${contentType || "unknown"}`);
		}

		if (kind === "image") {
			const image = await extractImage(url, response, contentType, maxBytes);
			controller.signal.throwIfAborted();
			return image;
		}

		if (kind === "pdf") {
			const bytes = await readBytesWithLimit(response, maxBytes);
			if (bytes.byteLength === 0) return failure(url, "Response body is empty");
			const pdf = await extractPdf(bytes, url, {
				signal: controller.signal,
				...(options.includeImages ? { includeImages: true } : {}),
			});
			controller.signal.throwIfAborted();
			return {
				url,
				title: pdf.title,
				content: pdf.content,
				error: pdf.content ? null : "PDF contains no extractable text",
				pageCount: pdf.pageCount,
				...(pdf.artifactDir ? { artifactDir: pdf.artifactDir } : {}),
			};
		}

		const body = decodeBody(await readBytesWithLimit(response, maxBytes), charsetFrom(contentType));
		controller.signal.throwIfAborted();

		// Plain text is already the content. Running it through the extractor
		// yields an empty document, or throws outright on input with no markup.
		if (kind === "text") {
			const text = body.trim();
			return text
				? { url, title: textTitle(text, url), content: text, error: null }
				: failure(url, "Response body is empty");
		}

		// Defuddle mutates the document it is given, so it gets a fresh parse.
		// linkedom's Document is structurally compatible but not the DOM lib type,
		// which this package does not pull in for a Node-only build.
		const { document } = parseHTML(body);

		// Collected before extraction, which strips most of the document and
		// rewrites the image sources that survive to point at link targets
		// rather than files.
		const candidates = options.includeImages
			? collectPageImages(document, response.url || url, options.imageLimit ?? DEFAULT_IMAGE_LIMIT)
			: [];

		// Read before extraction: Defuddle strips the head along with everything
		// else outside the article.
		const meta = parseOpenGraph(document as unknown as Parameters<typeof parseOpenGraph>[0]);

		const article = await Defuddle(document as Parameters<typeof Defuddle>[0], response.url || url, {
			markdown: true,
			// Defuddle parses synchronously before resolving when async is off,
			// which keeps it interruptible by the checks around it.
			useAsync: false,
		});

		const content = article.content?.trim() ?? "";
		const title = article.title?.trim() ?? "";

		// A login wall extracts as text, so it counts as success by length alone.
		// Where the metadata is the better answer, take it: on these hosts the
		// rendered page is navigation and prompts, and the post is in the head.
		const hostPrefersMetadata = prefersMetadata(response.url || url);
		if (
			(hostPrefersMetadata || content.length < THIN_CONTENT_CHARS) &&
			preferMetadata(meta, content, hostPrefersMetadata)
		) {
			return {
				url,
				title: meta.title ?? title,
				content: renderOpenGraph(meta),
				error: null,
				// Defuddle's own reading of the document is kept where the metadata
				// is silent: it finds a date in the body that no `og:` tag carries.
				...(meta.author || article.author ? { author: meta.author ?? article.author } : {}),
				...(meta.published || article.published ? { published: meta.published ?? article.published } : {}),
				...(meta.siteName || article.site ? { siteName: meta.siteName ?? article.site } : {}),
			};
		}

		if (!content) {
			return {
				url,
				title: title || (meta.title ?? ""),
				content: "",
				error: isLikelyJsRendered(body)
					? "Page appears to be JavaScript-rendered (content loads dynamically)"
					: "Could not extract readable content from HTML structure",
			};
		}

		const pageImages = await downloadPageImages(candidates, options);

		return {
			url,
			title,
			content: appendImageGallery(content, pageImages),
			...(options.includeImages ? { images: pageImages } : {}),
			// Short output is surfaced without discarding what was extracted:
			// the caller sees both the text and the doubt.
			error:
				content.length < THIN_CONTENT_CHARS && isLikelyJsRendered(body)
					? "Extracted content is unusually short; the page may be JavaScript-rendered"
					: null,
			...(article.author ? { author: article.author } : {}),
			...(article.published ? { published: article.published } : {}),
			...(typeof article.wordCount === "number" ? { wordCount: article.wordCount } : {}),
			...(article.site ? { siteName: article.site } : {}),
		};
	} catch (cause) {
		// An abort can surface as either signal's error, so report the cause the
		// caller cares about: their own cancellation outranks our timeout.
		if (options.signal?.aborted) return failure(url, "Aborted");
		if (controller.signal.aborted) return failure(url, `Timed out after ${timeoutMs}ms`);
		return failure(url, errorMessage(cause));
	} finally {
		clearTimeout(timer);
		options.signal?.removeEventListener("abort", onAbort);
	}
}

/**
 * Route a GitHub URL to the API, or return null to use the generic path.
 *
 * A failure here falls through rather than propagating: the rendered page is a
 * worse answer than the API's, but it is a far better one than an error, and
 * `gh` may simply be absent.
 */
async function handleGithubUrl(url: string, options: ExtractOptions): Promise<ExtractedContent | null> {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}
	if (!isGithubUrl(parsed)) return null;

	const route = matchRoute(parsed.pathname);
	if (!route) return null;

	// A blob's rendered page extracts as its own line-number gutter, so the
	// file is fetched from the raw host instead. That needs no credentials,
	// and the normal content-type handling applies to whatever comes back.
	if (route.kind === "blob") {
		const raw = await extractContent(rawUrlFor(route), options);
		if (raw.error && !raw.content) return null;
		return { ...raw, url, title: raw.title || `${route.owner}/${route.repo}: ${route.path ?? ""}` };
	}

	try {
		const page = await fetchGithubPage(route, options.signal);
		return { url, title: page.title, content: page.content, error: null };
	} catch {
		return null;
	}
}

/**
 * Fetch several URLs with bounded concurrency.
 *
 * The cap keeps a large batch from opening dozens of sockets at once; results
 * stay in input order so callers can pair them with what they asked for.
 */
export async function extractAll(
	urls: readonly string[],
	options: ExtractOptions = {},
	concurrency = 5,
): Promise<ExtractedContent[]> {
	const results: ExtractedContent[] = Array.from({ length: urls.length });
	let next = 0;

	const worker = async () => {
		for (;;) {
			const index = next++;
			if (index >= urls.length) return;
			results[index] = await extractContent(urls[index]!, options);
		}
	};

	await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
	return results;
}
