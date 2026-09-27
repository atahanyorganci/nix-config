import { Type } from "@earendil-works/pi-ai";
import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	defineTool,
	formatSize,
	truncateHead,
} from "@earendil-works/pi-coding-agent";
import { getApiKey, searchDocs } from "./client.ts";
import { formatResponse, groupByLibrary } from "./format.ts";

export const context7 = defineTool({
	name: "context7",
	label: "Context7",
	description: [
		"Search up-to-date documentation and code examples for libraries, frameworks, SDKs, APIs and CLIs via Context7.",
		"Prefer this over web search for library docs, and use it even for well-known libraries: training data may be stale.",
		"One call selects the relevant libraries (up to four), retrieves and reranks their snippets.",
		"Keep `query` to one specific concept; make separate calls for unrelated questions.",
		"Each result block is headed by its library ID (e.g. /vercel/next.js); when results mix in an unrelated library,",
		"call again passing the exact ID in `libraries`.",
		"Do not include secrets or proprietary code in the query: it is sent to Context7.",
		`Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}.`,
	].join(" "),
	parameters: Type.Object({
		query: Type.String({
			minLength: 1,
			maxLength: 500,
			description:
				"A specific question, e.g. 'How to protect routes with middleware in the App Router'. Not a bare keyword like 'auth'.",
		}),
		libraries: Type.Optional(
			Type.Array(Type.String({ minLength: 1, maxLength: 120 }), {
				maxItems: 4,
				description:
					"Optional library hints: fuzzy names ('next.js', 'zod') or exact Context7 IDs ('/vercel/next.js'). " +
					"Pin a version inline with '@' ('/vercel/next.js@15'). Omit when the library is obvious from the query.",
			}),
		),
		version: Type.Optional(
			Type.String({
				description:
					"Version to prefer, e.g. '15' or '4.2.1'. Requires `libraries`. " +
					"If it is not indexed the result says so and serves current docs.",
			}),
		),
		language: Type.Optional(
			Type.String({
				maxLength: 40,
				description: "Programming language to rank higher, e.g. 'TypeScript'. A preference, not a filter.",
			}),
		),
	}),

	async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
		const authenticated = getApiKey() !== undefined;

		// The server rejects this too, but its message does not name the
		// parameter the model has to add.
		if (params.version && !params.libraries?.length) {
			throw new Error("`version` requires at least one entry in `libraries` to apply it to.");
		}

		const outcome = await searchDocs(params.query, {
			libraries: params.libraries,
			version: params.version,
			language: params.language,
			signal,
		});

		if (!outcome.found) {
			const hint = params.libraries?.length
				? "Try another name, an exact ID such as /owner/repo, or fall back to web search."
				: "Try naming the library in `libraries`, or fall back to web search.";
			return {
				content: [{ type: "text", text: `No Context7 documentation matched: ${outcome.message} ${hint}` }],
				details: { query: params.query, libraries: [], codeSnippets: 0, infoSnippets: 0, authenticated },
			};
		}

		const { response, partialReason } = outcome;
		const markdown = formatResponse(response, partialReason);
		const truncation = truncateHead(markdown, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES });
		let text = truncation.content;
		if (truncation.truncated) {
			text +=
				`\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines ` +
				`(${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). ` +
				"Ask a narrower question or restrict `libraries` to see the rest.]";
		}

		return {
			content: [{ type: "text", text }],
			details: {
				query: params.query,
				libraries: groupByLibrary(response).map(group => group.libraryId),
				codeSnippets: response.codeSnippets.length,
				infoSnippets: response.infoSnippets.length,
				authenticated,
				truncated: truncation.truncated,
				...(response.version ? { version: response.version } : {}),
				...(partialReason ? { partialReason } : {}),
			},
		};
	},
});
