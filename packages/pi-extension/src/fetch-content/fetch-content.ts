import { Type } from "@earendil-works/pi-ai";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { extractAll } from "./extract.ts";
import type { ExtractedContent } from "./extract.ts";

/**
 * CIDRs exempt from the SSRF guard's private-address checks.
 *
 * Empty by default. Set FETCH_CONTENT_ALLOW_RANGES to a comma-separated list
 * to reach hosts that are private by definition but legitimate here, such as
 * a mesh network's carrier-grade NAT space.
 */
export function getAllowRanges(): string[] {
	return (process.env.FETCH_CONTENT_ALLOW_RANGES ?? "")
		.split(",")
		.map(entry => entry.trim())
		.filter(entry => entry.length > 0);
}

/** Render one result as markdown, keeping the source URL attached to its text. */
function renderResult(result: ExtractedContent): string {
	const heading = result.title ? `# ${result.title}` : `# ${result.url}`;
	const meta = [
		`Source: ${result.url}`,
		result.author ? `Author: ${result.author}` : "",
		result.published ? `Published: ${result.published}` : "",
	]
		.filter(Boolean)
		.join("\n");

	if (!result.content) {
		return `${heading}\n\n${meta}\n\nError: ${result.error ?? "No content extracted"}`;
	}

	// A warning rides along with the content rather than replacing it, so a
	// thin-but-usable extraction is still worth something to the caller.
	const warning = result.error ? `\n\nNote: ${result.error}` : "";
	return `${heading}\n\n${meta}${warning}\n\n${result.content}`;
}

export const fetchContent = defineTool({
	name: "fetch_content",
	label: "Fetch Content",
	description:
		"Fetch one or more web pages and return their main content as markdown, with navigation, ads and boilerplate removed.",
	promptSnippet: "Use to read the content of a web page by URL.",
	parameters: Type.Object({
		url: Type.Optional(Type.String({ description: "A single URL to fetch." })),
		urls: Type.Optional(
			Type.Array(Type.String(), {
				minItems: 1,
				maxItems: 10,
				description: "Several URLs to fetch in parallel.",
			}),
		),
	}),

	async execute(_toolCallId, params, signal, onUpdate, _ctx) {
		const urls = [...(params.url ? [params.url] : []), ...(params.urls ?? [])];

		if (urls.length === 0) {
			const error = "Provide either url or urls.";
			return { content: [{ type: "text", text: `Error: ${error}` }], details: { error } };
		}

		onUpdate?.({
			content: [{ type: "text", text: `Fetching ${urls.length} URL(s)...` }],
			details: { phase: "fetch" },
		});

		const allowRanges = getAllowRanges();
		const results = await extractAll(urls, {
			...(signal ? { signal } : {}),
			...(allowRanges.length > 0 ? { allowRanges } : {}),
		});

		const succeeded = results.filter(result => result.content.length > 0).length;

		return {
			content: [{ type: "text", text: results.map(renderResult).join("\n\n---\n\n") }],
			details: {
				requested: urls.length,
				succeeded,
				failed: urls.length - succeeded,
				results: results.map(({ url, title, error, wordCount }) => ({ url, title, error, wordCount })),
			},
		};
	},
});
