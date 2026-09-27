import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSearchUrl, parseResponse, searchDocs } from "../src/context7/client.ts";
import { context7 } from "../src/context7/context7.ts";
import { formatResponse, groupByLibrary } from "../src/context7/format.ts";
import type { SearchResponse } from "../src/context7/client.ts";

/** Trimmed from a live `/v3/search?type=json` response for Next.js + OpenAI. */
const live = {
	codeSnippets: [
		{
			codeTitle: "Stream AI responses using AI SDK in route handler",
			codeDescription: "Streams AI-generated content in a Route Handler.",
			codeLanguage: "typescript",
			codeTokens: 120,
			codeId: "https://nextjs.org/docs/app/api-reference/file-conventions/route",
			pageTitle: "route.js",
			codeList: [{ language: "typescript", code: "export async function POST(req: Request) {}" }],
			libraryId: "/websites/nextjs",
		},
		{
			codeTitle: "Responses API Endpoints",
			codeDescription: "POST /responses",
			codeLanguage: "APIDOC",
			codeTokens: 300,
			codeId: "https://github.com/openai/openai-openapi/blob/main/_autodocs/api-reference/responses.md",
			pageTitle: "Responses",
			codeList: [{ language: "APIDOC", code: "## [POST] /responses" }],
			libraryId: "/openai/openai-openapi",
		},
		{
			codeTitle: "Route handler streaming",
			codeDescription: "",
			codeLanguage: "ts",
			codeTokens: 50,
			codeId: "https://github.com/vercel/next.js/blob/canary/docs/route.mdx",
			pageTitle: "Route",
			codeList: [{ language: "ts", code: "new Response(stream)" }],
			libraryId: "/websites/nextjs",
		},
	],
	infoSnippets: [
		{
			pageId: "https://github.com/openai/openai-openapi/blob/main/_autodocs/index.md",
			breadcrumb: "OpenAI API > Document map",
			content: "- endpoints.md — complete route table",
			contentTokens: 131,
			libraryId: "/openai/openai-openapi",
		},
	],
};

function json(body: unknown, init: ResponseInit = {}): Response {
	const headers = new Headers(init.headers);
	headers.set("Content-Type", "application/json");
	return new Response(JSON.stringify(body), { ...init, headers });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
	vi.stubGlobal("fetch", fetchMock);
	vi.stubEnv("CONTEXT7_API_KEY", "");
	vi.stubEnv("CONTEXT7_API_URL", "");
});

afterEach(() => {
	fetchMock.mockReset();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.useRealTimers();
});

function requestedHeaders(call = 0): Record<string, string> {
	return (fetchMock.mock.calls[call]?.[1]?.headers ?? {}) as Record<string, string>;
}

describe("buildSearchUrl", () => {
	it("repeats `library` and always asks for JSON", () => {
		const url = buildSearchUrl("stream a response", {
			libraries: ["next.js", " /openai/openai-node ", ""],
			version: "15",
			language: "TypeScript",
		});
		expect(url.origin + url.pathname).toBe("https://context7.com/api/v3/search");
		expect(url.searchParams.getAll("library")).toEqual(["next.js", "/openai/openai-node"]);
		expect(url.searchParams.get("type")).toBe("json");
		expect(url.searchParams.get("version")).toBe("15");
		expect(url.searchParams.get("language")).toBe("TypeScript");
	});

	it("omits unset options", () => {
		const url = buildSearchUrl("q");
		expect([...url.searchParams.keys()]).toEqual(["query", "type"]);
	});

	it("honours CONTEXT7_API_URL and rejects nonsense", () => {
		vi.stubEnv("CONTEXT7_API_URL", "http://localhost:3000/api/");
		expect(buildSearchUrl("q").toString()).toMatch(/^http:\/\/localhost:3000\/api\/v3\/search\?/);
		vi.stubEnv("CONTEXT7_API_URL", "ftp://example.com");
		expect(() => buildSearchUrl("q")).toThrow(/not an HTTP/);
	});
});

describe("searchDocs", () => {
	it("sends the key only when one is configured", async () => {
		fetchMock.mockResolvedValue(json(live));
		await searchDocs("q");
		expect(requestedHeaders().Authorization).toBeUndefined();

		vi.stubEnv("CONTEXT7_API_KEY", "ctx7sk-test");
		fetchMock.mockResolvedValue(json(live));
		await searchDocs("q");
		expect(requestedHeaders(1).Authorization).toBe("Bearer ctx7sk-test");
	});

	it("treats no_documentation_found as an empty result", async () => {
		fetchMock.mockResolvedValue(
			json({ error: "no_documentation_found", message: "No documentation library matched." }, { status: 404 }),
		);
		expect(await searchDocs("q", { libraries: ["zzqq"] })).toEqual({
			found: false,
			message: "No documentation library matched.",
		});
	});

	it("surfaces any other 404", async () => {
		fetchMock.mockResolvedValue(new Response("Not Found", { status: 404 }));
		await expect(searchDocs("q")).rejects.toThrow(/404: Not Found/);
	});

	it("retries a 503 once", async () => {
		vi.useFakeTimers();
		fetchMock
			.mockResolvedValueOnce(json({ error: "search_failed", message: "try again" }, { status: 503 }))
			.mockResolvedValueOnce(json(live));
		const pending = searchDocs("q");
		await vi.advanceTimersByTimeAsync(1_000);
		const outcome = await pending;
		expect(outcome.found).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("gives up after the retry", async () => {
		vi.useFakeTimers();
		fetchMock.mockImplementation(async () =>
			json({ error: "search_failed", message: "The documentation search could not be completed." }, { status: 503 }),
		);
		const pending = expect(searchDocs("q")).rejects.toThrow(/HTTP 503.*could not be completed/);
		await vi.advanceTimersByTimeAsync(1_000);
		await pending;
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("explains rate limits, suggesting a key only when there is none", async () => {
		const limited = (): Response =>
			json(
				{ error: "rate_limit_exceeded", message: "Rate limit exceeded." },
				{ status: 429, headers: { "Retry-After": "42" } },
			);

		fetchMock.mockResolvedValue(limited());
		await expect(searchDocs("q")).rejects.toThrow(/Retry after 42s\. Anonymous requests.*CONTEXT7_API_KEY/);

		vi.stubEnv("CONTEXT7_API_KEY", "ctx7sk-test");
		fetchMock.mockResolvedValue(limited());
		await expect(searchDocs("q")).rejects.toThrow(/^Context7 rate limit exceeded \(HTTP 429\)\. Retry after 42s\.$/);
	});

	it("points at the key on 401", async () => {
		fetchMock.mockResolvedValue(json({ error: "unauthorized", message: "Invalid API key" }, { status: 401 }));
		await expect(searchDocs("q")).rejects.toThrow(/Invalid API key.*ctx7sk/);
	});

	it("forwards the server's validation message", async () => {
		fetchMock.mockResolvedValue(
			json({ error: "validation_error", message: "Too big: expected array to have <=4 items" }, { status: 400 }),
		);
		await expect(searchDocs("q")).rejects.toThrow(/HTTP 400\): Too big/);
	});

	it("reads the partial-result headers", async () => {
		fetchMock.mockResolvedValue(
			json(live, {
				headers: { "X-Context7-Search-Status": "partial", "X-Context7-Search-Reason": "versionPrerelease" },
			}),
		);
		expect(await searchDocs("q")).toMatchObject({ found: true, partialReason: "versionPrerelease" });

		fetchMock.mockResolvedValue(
			json(live, { headers: { "X-Context7-Search-Status": "partial", "X-Context7-Search-Reason": "somethingNew" } }),
		);
		expect(await searchDocs("q")).toMatchObject({ partialReason: "partialSearchFailure" });

		fetchMock.mockResolvedValue(json(live));
		expect(await searchDocs("q")).not.toHaveProperty("partialReason");
	});
});

describe("parseResponse", () => {
	it("tolerates missing and malformed fields", () => {
		const parsed = parseResponse({
			codeSnippets: [
				null,
				{ codeTitle: "t", codeList: [{ code: "" }, { language: "js", code: "x" }], libraryId: "/a/b" },
			],
			infoSnippets: "nope",
			rules: { global: [], libraries: [{ libraryId: "/a/b", libraryOwn: [], libraryTeam: [] }] },
			version: { status: "weird" },
		});
		expect(parsed.codeSnippets).toHaveLength(1);
		expect(parsed.codeSnippets[0]?.codeList).toEqual([{ language: "js", code: "x" }]);
		expect(parsed.infoSnippets).toEqual([]);
		expect(parsed).not.toHaveProperty("rules");
		expect(parsed).not.toHaveProperty("version");
	});

	it("rejects a non-object body", () => {
		expect(() => parseResponse([])).toThrow(/unexpected response shape/);
	});
});

describe("formatResponse", () => {
	const response = parseResponse(live);

	it("groups by library in order of first appearance", () => {
		expect(groupByLibrary(response).map(group => [group.libraryId, group.code.length, group.info.length])).toEqual([
			["/websites/nextjs", 2, 0],
			["/openai/openai-openapi", 1, 1],
		]);
	});

	it("mirrors the server's txt layout and points at the IDs when several libraries answer", () => {
		const text = formatResponse(response);
		expect(text.startsWith("Library: /websites/nextjs\n\n### Stream AI responses")).toBe(true);
		expect(text).toContain("Source: https://nextjs.org/docs/app/api-reference/file-conventions/route");
		expect(text).toContain("```typescript\nexport async function POST(req: Request) {}\n```");
		expect(text).toContain("### OpenAI API > Document map");
		expect(text).toMatch(/Results came from 2 libraries.*exact library ID/);
	});

	it("does not add the narrowing hint for a single library", () => {
		const single: SearchResponse = { codeSnippets: response.codeSnippets.slice(0, 1), infoSnippets: [] };
		expect(formatResponse(single)).not.toContain("Results came from");
	});

	it("widens the fence around code that contains one", () => {
		const nested: SearchResponse = {
			codeSnippets: [{ ...response.codeSnippets[0]!, codeList: [{ language: "md", code: "```js\nx\n```" }] }],
			infoSnippets: [],
		};
		expect(formatResponse(nested)).toContain("````md\n```js\nx\n```\n````");
	});

	it("leads with version mismatches and rules", () => {
		const text = formatResponse(
			{
				...response,
				version: {
					requested: "14",
					status: "prerelease",
					libraries: [
						{
							libraryId: "/vercel/next.js/v14.3.0-canary.87",
							requested: "14",
							served: "v14.3.0-canary.87",
							status: "prerelease",
						},
						{ libraryId: "/websites/nextjs", requested: "14", served: null, status: "unverified" },
					],
				},
				rules: {
					global: ["Use the App Router"],
					libraries: [{ libraryId: "/websites/nextjs", libraryOwn: ["Prefer RSC"], libraryTeam: [] }],
				},
			},
			"versionPrerelease",
		);
		expect(text.startsWith("Warning — version mismatch:\n- /vercel/next.js/v14.3.0-canary.87: only a prerelease")).toBe(
			true,
		);
		expect(text).toContain(
			"- /websites/nextjs: no documentation indexed for version 14; serving current documentation",
		);
		expect(text).toContain("Guidelines:\n- Use the App Router");
		expect(text).toContain("Library: /websites/nextjs\n\nLibrary guidelines:\n- Prefer RSC");
	});

	it("flags a partial search failure", () => {
		expect(formatResponse(response, "partialSearchFailure")).toMatch(
			/^Note: Context7 reported a partial search failure/,
		);
	});
});

describe("context7 tool", () => {
	const run = (params: Parameters<typeof context7.execute>[1]) =>
		context7.execute("call", params, undefined, undefined, {} as Parameters<typeof context7.execute>[4]);

	it("refuses a version without a library before calling out", async () => {
		await expect(run({ query: "routing", version: "15" })).rejects.toThrow(
			/requires at least one entry in `libraries`/,
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("reports what it served", async () => {
		fetchMock.mockResolvedValue(json(live));
		const result = await run({ query: "stream", libraries: ["next.js", "openai"] });
		expect(result.details).toMatchObject({
			libraries: ["/websites/nextjs", "/openai/openai-openapi"],
			codeSnippets: 3,
			infoSnippets: 1,
			authenticated: false,
			truncated: false,
		});
	});

	it("answers an empty search with a next step instead of an error", async () => {
		fetchMock.mockResolvedValue(
			json({ error: "no_documentation_found", message: "Nothing matched." }, { status: 404 }),
		);
		const result = await run({ query: "widgets", libraries: ["zzqq"] });
		expect(result.content[0]).toMatchObject({
			type: "text",
			text: expect.stringMatching(/^No Context7 documentation matched: Nothing matched\. Try another name/),
		});
	});

	it("truncates oversized output and says so", async () => {
		const huge = {
			codeSnippets: [{ ...live.codeSnippets[0], codeList: [{ language: "txt", code: "x\n".repeat(5_000) }] }],
			infoSnippets: [],
		};
		fetchMock.mockResolvedValue(json(huge));
		const result = await run({ query: "q" });
		expect(result.details).toMatchObject({ truncated: true });
		expect(result.content[0]).toMatchObject({ text: expect.stringContaining("[Output truncated:") });
	});
});
