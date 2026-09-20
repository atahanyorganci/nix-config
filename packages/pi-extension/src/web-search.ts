import { StringEnum, Type } from "@earendil-works/pi-ai";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { getBaseUrl, searchWithSearXNG } from "./searxng.ts";
import type { RecencyFilter } from "./searxng.ts";

export const webSearch = defineTool({
	name: "web_search",
	label: "Web Search",
	description:
		"Search the web via the self-hosted SearXNG instance. Returns ranked results with titles, URLs and snippets.",
	parameters: Type.Object({
		query: Type.String({ description: "The search query." }),
		numResults: Type.Optional(
			Type.Integer({ minimum: 1, maximum: 20, description: "Maximum results to return (default 5)." }),
		),
		recencyFilter: Type.Optional(
			// StringEnum keeps the schema compatible with Google's function-calling
			// dialect, which rejects anyOf-style const unions.
			StringEnum(["day", "week", "month", "year"], {
				description: "Restrict results to content published within this window.",
			}),
		),
		domainFilter: Type.Optional(
			Type.Array(Type.String(), {
				description: "Domains to restrict results to, or '-example.com' to exclude a domain.",
			}),
		),
	}),

	async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
		const { answer, results } = await searchWithSearXNG(params.query, {
			numResults: params.numResults,
			recencyFilter: params.recencyFilter as RecencyFilter | undefined,
			domainFilter: params.domainFilter,
			signal,
		});

		if (results.length === 0) {
			return {
				content: [{ type: "text", text: `No results found for "${params.query}".` }],
				details: { query: params.query, resultCount: 0, baseUrl: getBaseUrl() },
			};
		}

		return {
			content: [{ type: "text", text: answer }],
			details: { query: params.query, resultCount: results.length, results, baseUrl: getBaseUrl() },
		};
	},
});
