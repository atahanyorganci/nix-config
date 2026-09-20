/**
 * SearXNG search provider, adapted from `nicobailon/pi-web-access` (`searxng.ts`).
 *
 * Trimmed to what this repo needs: the upstream file resolves its base URL and
 * extra headers from a `~/.pi` JSON config and routes every request through the
 * project's SSRF guard. Here the instance is a known self-hosted service, so the
 * base URL is a constant that `SEARXNG_BASE_URL` may override, and the SSRF layer
 * is dropped along with the activity-monitor instrumentation.
 */

const DEFAULT_BASE_URL = "https://search.yorganci.dev";
const SEARCH_TIMEOUT_MS = 30_000;
/** SearXNG caps `time_range` to these buckets; anything else must be omitted. */
const TIME_RANGES = ["day", "week", "month", "year"] as const;

export type RecencyFilter = (typeof TIME_RANGES)[number];

export interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

export interface SearchResponse {
	answer: string;
	results: SearchResult[];
}

// Properties accept an explicit `undefined` so callers can forward optional
// tool parameters directly under `exactOptionalPropertyTypes`.
export interface SearchOptions {
	numResults?: number | undefined;
	recencyFilter?: RecencyFilter | undefined;
	/** Domains to restrict to, or `-example.com` to exclude. */
	domainFilter?: string[] | undefined;
	signal?: AbortSignal | undefined;
}

interface SearXNGResult {
	title?: string;
	url?: string;
	content?: string;
}

interface SearXNGResponse {
	results?: SearXNGResult[];
	answers?: string[];
}

interface DomainFilters {
	allowed: string[];
	blocked: string[];
}

function normalizeBaseUrl(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	try {
		const url = new URL(trimmed);
		if (url.protocol !== "http:" && url.protocol !== "https:") return null;
		// Credentials in the base URL would leak into every request.
		if (url.username || url.password) return null;
		url.search = "";
		url.hash = "";
		return url.toString().replace(/\/+$/, "");
	} catch {
		return null;
	}
}

export function getBaseUrl(): string {
	const configured = process.env.SEARXNG_BASE_URL;
	if (configured === undefined) return DEFAULT_BASE_URL;
	const normalized = normalizeBaseUrl(configured);
	if (!normalized) {
		throw new Error(`SEARXNG_BASE_URL is not a valid HTTP(S) URL: ${configured}`);
	}
	return normalized;
}

function normalizeDomain(value: string): string | null {
	let input = value.trim().toLowerCase();
	if (input.startsWith("-")) input = input.slice(1).trim();
	if (!input) return null;
	try {
		const parsed = input.includes("://") ? new URL(input) : new URL(`https://${input}`);
		input = parsed.hostname;
	} catch {
		input = input.split("/")[0]?.split(":")[0] ?? "";
	}
	input = input.replace(/^\.+|\.+$/g, "");
	return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(input) ? input : null;
}

function normalizeDomainFilters(domainFilter: string[] | undefined): DomainFilters {
	const filters: DomainFilters = { allowed: [], blocked: [] };
	for (const raw of domainFilter ?? []) {
		const domain = normalizeDomain(raw);
		if (!domain) continue;
		const target = raw.trim().startsWith("-") ? filters.blocked : filters.allowed;
		if (!target.includes(domain)) target.push(domain);
	}
	return filters;
}

function buildQuery(query: string, filters: DomainFilters): string {
	const parts = [query];
	if (filters.allowed.length === 1) {
		parts.push(`site:${filters.allowed[0]}`);
	} else if (filters.allowed.length > 1) {
		parts.push(filters.allowed.map(domain => `site:${domain}`).join(" OR "));
	}
	for (const domain of filters.blocked) parts.push(`-site:${domain}`);
	return parts.join(" ");
}

function hostMatchesDomain(hostname: string, domain: string): boolean {
	return hostname === domain || hostname.endsWith(`.${domain}`);
}

/**
 * `site:` operators are only a hint — engines honour them inconsistently — so
 * results are filtered again on the client.
 */
function matchesDomainFilters(url: string, filters: DomainFilters): boolean {
	if (filters.allowed.length === 0 && filters.blocked.length === 0) return true;
	let hostname: string;
	try {
		hostname = new URL(url).hostname.toLowerCase();
	} catch {
		return false;
	}
	if (filters.allowed.length > 0 && !filters.allowed.some(domain => hostMatchesDomain(hostname, domain))) {
		return false;
	}
	return !filters.blocked.some(domain => hostMatchesDomain(hostname, domain));
}

function normalizeResultCount(value: number | undefined): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return 5;
	return Math.max(1, Math.min(Math.floor(value), 20));
}

export async function searchWithSearXNG(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
	const baseUrl = getBaseUrl();
	const numResults = normalizeResultCount(options.numResults);
	const filters = normalizeDomainFilters(options.domainFilter);

	const url = new URL(`${baseUrl}/search`);
	url.searchParams.set("q", buildQuery(query, filters));
	url.searchParams.set("format", "json");
	if (options.recencyFilter) url.searchParams.set("time_range", options.recencyFilter);

	const timeout = AbortSignal.timeout(SEARCH_TIMEOUT_MS);
	const response = await fetch(url, {
		method: "GET",
		headers: { Accept: "application/json" },
		redirect: "manual",
		signal: options.signal ? AbortSignal.any([timeout, options.signal]) : timeout,
	});

	// The instance is exposed in NetBird-only mode, so reaching it requires an
	// active mesh connection. Should it ever be put back behind OIDC, the proxy
	// answers with a redirect to the identity provider rather than a 401;
	// following that would parse an HTML login page as a confusing JSON error.
	if (response.status >= 300 && response.status < 400) {
		throw new Error(
			`SearXNG at ${baseUrl} redirected to authentication (HTTP ${response.status}). ` +
				"Connect to the NetBird mesh, or set SEARXNG_BASE_URL to reach the " +
				"host directly, e.g. http://mars.netbird.selfhosted:8888",
		);
	}

	if (!response.ok) {
		const errorText = await response.text();
		if (response.status === 403) {
			throw new Error(
				`SearXNG at ${baseUrl} refused the JSON API (HTTP 403). ` +
					"Ensure `json` is listed in the instance's `search.formats`.",
			);
		}
		throw new Error(`SearXNG search error ${response.status}: ${errorText.slice(0, 300)}`);
	}

	let data: SearXNGResponse;
	try {
		data = (await response.json()) as SearXNGResponse;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`SearXNG returned invalid JSON: ${message}`);
	}

	const results: SearchResult[] = [];
	for (const item of data.results ?? []) {
		if (!item.url || !matchesDomainFilters(item.url, filters)) continue;
		results.push({ title: item.title || item.url, url: item.url, snippet: item.content || "" });
		if (results.length >= numResults) break;
	}

	const answerParts = (data.answers ?? [])
		.filter(answer => typeof answer === "string" && answer.trim().length > 0)
		.map(answer => answer.trim());
	answerParts.push(
		...results.map(result =>
			result.snippet
				? `${result.snippet}\nSource: ${result.title} (${result.url})`
				: `Source: ${result.title} (${result.url})`,
		),
	);

	return { answer: answerParts.join("\n\n"), results };
}
