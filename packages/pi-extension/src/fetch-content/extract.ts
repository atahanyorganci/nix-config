import { Defuddle } from "defuddle/node";
import { parseHTML } from "linkedom";
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
type ContentKind = "markup" | "text" | "unsupported";

function classifyContentType(contentType: string): ContentKind {
	const type = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
	if (type === "text/html" || type === "application/xhtml+xml") return "markup";
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

function errorMessage(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

function failure(url: string, error: string): ExtractedContent {
	return { url, title: "", content: "", error };
}

/**
 * Fetch one URL and extract its readable content.
 *
 * Every failure is returned rather than thrown: a batch of URLs should report
 * per-URL outcomes instead of losing the successful ones to a single error.
 */
export async function extractContent(url: string, options: ExtractOptions = {}): Promise<ExtractedContent> {
	if (options.signal?.aborted) return failure(url, "Aborted");

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
			return failure(url, `HTTP ${response.status}: ${response.statusText}`);
		}

		const contentType = response.headers.get("content-type") ?? "";
		const kind = classifyContentType(contentType);
		if (kind === "unsupported") {
			return failure(url, `Unsupported content type: ${contentType || "unknown"}`);
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
		const article = await Defuddle(document as Parameters<typeof Defuddle>[0], response.url || url, {
			markdown: true,
			// Defuddle parses synchronously before resolving when async is off,
			// which keeps it interruptible by the checks around it.
			useAsync: false,
		});

		const content = article.content?.trim() ?? "";
		const title = article.title?.trim() ?? "";

		if (!content) {
			return {
				url,
				title,
				content: "",
				error: isLikelyJsRendered(body)
					? "Page appears to be JavaScript-rendered (content loads dynamically)"
					: "Could not extract readable content from HTML structure",
			};
		}

		return {
			url,
			title,
			content,
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
