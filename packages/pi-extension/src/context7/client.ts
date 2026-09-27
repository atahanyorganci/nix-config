/**
 * Client for Context7's one-shot documentation search, `GET /v3/search`.
 *
 * v3 folds library resolution into retrieval: it picks up to four libraries
 * from the question and the optional hints, fetches their documentation in
 * parallel and reranks the snippets globally. That is what lets this extension
 * expose a single tool where the upstream MCP server and pi package need two
 * (`resolve-library-id` followed by `query-docs` against the v2 API).
 *
 * The API accepts anonymous requests at a lower rate limit, so the key is
 * optional. `CONTEXT7_API_KEY` and `CONTEXT7_API_URL` are the names the
 * upstream SDK and MCP server read, so a key exported for either works here.
 */

const DEFAULT_BASE_URL = "https://context7.com/api";

/**
 * Upstream's MCP server settles on 60s after observing a p99.9 of ~3s; the
 * ceiling only matters for a stalled backend, which would otherwise ride
 * undici's five-minute default.
 */
const SEARCH_TIMEOUT_MS = 60_000;

/** `503 search_failed` is documented as retryable; one retry absorbs a blip. */
const RETRY_DELAY_MS = 1_000;

export type VersionStatus = "verified" | "prerelease" | "unverified";

/** Why `X-Context7-Search-Status: partial` was set. */
export type PartialReason = "partialSearchFailure" | "versionUnverified" | "versionPrerelease";

export interface CodeExample {
	language: string;
	code: string;
}

export interface CodeSnippet {
	libraryId: string;
	codeTitle: string;
	codeDescription: string;
	codeLanguage: string;
	codeTokens: number;
	/** URL of the source location. */
	codeId: string;
	pageTitle: string;
	codeList: CodeExample[];
	/** Recovered from the source-code index rather than the docs. */
	isDynamic?: boolean;
	sourceFile?: string;
}

export interface InfoSnippet {
	libraryId: string;
	/** URL of the source page. */
	pageId?: string;
	breadcrumb?: string;
	content: string;
	contentTokens: number;
}

export interface LibraryRules {
	libraryId: string;
	libraryOwn: string[];
	libraryTeam: string[];
}

export interface LibraryVersion {
	/** Includes the served tag when one matched, e.g. `/vercel/next.js/v15.1.11`. */
	libraryId: string;
	requested: string;
	/** Null when current documentation was served instead. */
	served: string | null;
	status: VersionStatus;
}

export interface VersionReport {
	requested?: string;
	/** The worst outcome across the returned libraries. */
	status: VersionStatus;
	libraries: LibraryVersion[];
}

export interface SearchResponse {
	codeSnippets: CodeSnippet[];
	infoSnippets: InfoSnippet[];
	rules?: { global?: string[]; libraries?: LibraryRules[] };
	version?: VersionReport;
}

export interface SearchOptions {
	/** Up to four fuzzy names (`next.js`) or exact IDs (`/vercel/next.js@15`). */
	libraries?: string[] | undefined;
	/** Requires at least one library; the server rejects it otherwise. */
	version?: string | undefined;
	/** Soft preference for ranking, e.g. `TypeScript`. */
	language?: string | undefined;
	signal?: AbortSignal | undefined;
}

/**
 * Nothing matched is an ordinary outcome for a documentation search, not a
 * failure, so it is a variant rather than an exception.
 */
export type SearchOutcome =
	| { found: true; response: SearchResponse; partialReason?: PartialReason }
	| { found: false; message: string };

export class Context7Error extends Error {
	readonly status: number;
	readonly code: string | undefined;

	constructor(message: string, status: number, code?: string) {
		super(message);
		this.name = "Context7Error";
		this.status = status;
		this.code = code;
	}
}

export function getBaseUrl(): string {
	const configured = process.env.CONTEXT7_API_URL?.trim();
	if (!configured) return DEFAULT_BASE_URL;
	let url: URL;
	try {
		url = new URL(configured);
	} catch {
		throw new Error(`CONTEXT7_API_URL is not a valid URL: ${configured}`);
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new Error(`CONTEXT7_API_URL is not an HTTP(S) URL: ${configured}`);
	}
	return url.toString().replace(/\/+$/, "");
}

export function getApiKey(): string | undefined {
	return process.env.CONTEXT7_API_KEY?.trim() || undefined;
}

export function buildSearchUrl(query: string, options: SearchOptions = {}): URL {
	const url = new URL(`${getBaseUrl()}/v3/search`);
	url.searchParams.set("query", query);
	// Structured snippets, rather than the server's `txt` rendering, carry the
	// per-library version report; `txt` only exposes the worst case in headers.
	url.searchParams.set("type", "json");
	// Repeated, not comma-joined: the spec declares `style: form, explode: true`.
	for (const library of options.libraries ?? []) {
		const trimmed = library.trim();
		if (trimmed) url.searchParams.append("library", trimmed);
	}
	if (options.version?.trim()) url.searchParams.set("version", options.version.trim());
	if (options.language?.trim()) url.searchParams.set("language", options.language.trim());
	return url;
}

export async function searchDocs(query: string, options: SearchOptions = {}): Promise<SearchOutcome> {
	const url = buildSearchUrl(query, options);
	const apiKey = getApiKey();
	const headers: Record<string, string> = { Accept: "application/json" };
	if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

	let response = await request(url, headers, options.signal);
	if (response.status === 503) {
		await sleep(RETRY_DELAY_MS, options.signal);
		response = await request(url, headers, options.signal);
	}

	if (response.status === 404) {
		const body = await readError(response);
		// Any other 404 would mean the endpoint moved, which should surface.
		if (body.code === "no_documentation_found") return { found: false, message: body.message };
		throw new Context7Error(`Context7 returned 404: ${body.message}`, 404, body.code);
	}

	if (!response.ok) {
		const body = await readError(response);
		throw new Context7Error(describeError(response, body, apiKey !== undefined), response.status, body.code);
	}

	let data: unknown;
	try {
		data = await response.json();
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Context7Error(`Context7 returned invalid JSON: ${message}`, response.status);
	}

	const parsed = parseResponse(data);
	const partialReason = readPartialReason(response.headers);
	return partialReason ? { found: true, response: parsed, partialReason } : { found: true, response: parsed };
}

function request(url: URL, headers: Record<string, string>, signal: AbortSignal | undefined): Promise<Response> {
	const timeout = AbortSignal.timeout(SEARCH_TIMEOUT_MS);
	return fetch(url, { method: "GET", headers, signal: signal ? AbortSignal.any([timeout, signal]) : timeout });
}

function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) return reject(signal.reason);
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = (): void => {
			clearTimeout(timer);
			reject(signal?.reason);
		};
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}

interface ErrorBody {
	code: string | undefined;
	message: string;
}

/** Errors are documented as `{ error, message }`, but a proxy may say otherwise. */
async function readError(response: Response): Promise<ErrorBody> {
	const text = await response.text().catch(() => "");
	try {
		const json = JSON.parse(text) as { error?: unknown; message?: unknown };
		const code = typeof json.error === "string" ? json.error : undefined;
		if (typeof json.message === "string" && json.message) return { code, message: json.message };
		if (code) return { code, message: code };
	} catch {
		// Not JSON; fall through to the raw body.
	}
	return { code: undefined, message: text.trim().slice(0, 300) || response.statusText || "no response body" };
}

function describeError(response: Response, body: ErrorBody, hasKey: boolean): string {
	switch (response.status) {
		case 401:
			return `Context7 rejected the API key (HTTP 401): ${body.message}. Keys start with "ctx7sk"; check CONTEXT7_API_KEY.`;
		case 429: {
			const retryAfter = response.headers.get("Retry-After");
			const wait = retryAfter ? ` Retry after ${retryAfter}s.` : "";
			const hint = hasKey
				? ""
				: " Anonymous requests have low limits; set CONTEXT7_API_KEY (free at https://context7.com/dashboard).";
			return `Context7 rate limit exceeded (HTTP 429).${wait}${hint}`;
		}
		default:
			return `Context7 request failed (HTTP ${response.status}): ${body.message}`;
	}
}

const PARTIAL_REASONS: readonly PartialReason[] = ["partialSearchFailure", "versionUnverified", "versionPrerelease"];

function readPartialReason(headers: Headers): PartialReason | undefined {
	if (headers.get("X-Context7-Search-Status") !== "partial") return undefined;
	const reason = headers.get("X-Context7-Search-Reason");
	// An unknown reason still means the results are partial; treat it as the
	// generic failure rather than dropping the signal.
	return PARTIAL_REASONS.find(known => known === reason) ?? "partialSearchFailure";
}

// The response is external input, so it is normalised field by field rather
// than cast: a missing array or a stray null must not crash the formatter.

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function strings(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item !== "") : [];
}

function records(value: unknown): Record<string, unknown>[] {
	return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isVersionStatus(value: unknown): value is VersionStatus {
	return value === "verified" || value === "prerelease" || value === "unverified";
}

export function parseResponse(data: unknown): SearchResponse {
	if (!isRecord(data)) throw new Context7Error("Context7 returned an unexpected response shape", 200);

	const codeSnippets = records(data.codeSnippets).map((item): CodeSnippet => {
		const snippet: CodeSnippet = {
			libraryId: str(item.libraryId),
			codeTitle: str(item.codeTitle),
			codeDescription: str(item.codeDescription),
			codeLanguage: str(item.codeLanguage),
			codeTokens: num(item.codeTokens),
			codeId: str(item.codeId),
			pageTitle: str(item.pageTitle),
			codeList: records(item.codeList)
				.map(example => ({ language: str(example.language), code: str(example.code) }))
				.filter(example => example.code !== ""),
		};
		if (item.isDynamic === true) snippet.isDynamic = true;
		if (str(item.sourceFile)) snippet.sourceFile = str(item.sourceFile);
		return snippet;
	});

	const infoSnippets = records(data.infoSnippets)
		.map((item): InfoSnippet => {
			const snippet: InfoSnippet = {
				libraryId: str(item.libraryId),
				content: str(item.content),
				contentTokens: num(item.contentTokens),
			};
			if (str(item.pageId)) snippet.pageId = str(item.pageId);
			if (str(item.breadcrumb)) snippet.breadcrumb = str(item.breadcrumb);
			return snippet;
		})
		.filter(snippet => snippet.content !== "");

	const response: SearchResponse = { codeSnippets, infoSnippets };

	if (isRecord(data.rules)) {
		const global = strings(data.rules.global);
		const libraries = records(data.rules.libraries)
			.map(item => ({
				libraryId: str(item.libraryId),
				libraryOwn: strings(item.libraryOwn),
				libraryTeam: strings(item.libraryTeam),
			}))
			.filter(rules => rules.libraryId && (rules.libraryOwn.length > 0 || rules.libraryTeam.length > 0));
		if (global.length > 0 || libraries.length > 0) {
			response.rules = {};
			if (global.length > 0) response.rules.global = global;
			if (libraries.length > 0) response.rules.libraries = libraries;
		}
	}

	if (isRecord(data.version) && isVersionStatus(data.version.status)) {
		const version: VersionReport = {
			status: data.version.status,
			libraries: records(data.version.libraries).flatMap((item): LibraryVersion[] =>
				isVersionStatus(item.status)
					? [
							{
								libraryId: str(item.libraryId),
								requested: str(item.requested),
								served: typeof item.served === "string" ? item.served : null,
								status: item.status,
							},
						]
					: [],
			),
		};
		if (str(data.version.requested)) version.requested = str(data.version.requested);
		response.version = version;
	}

	return response;
}
