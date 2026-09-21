import { Type } from "@earendil-works/pi-ai";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { isCobaltUrl, resolveMedia } from "./cobalt.ts";
import { extractAll } from "./extract.ts";
import { fetchMedia, mediaContentBlocks } from "./media.ts";
import type { ExtractedContent } from "./extract.ts";
import type { ImageContent, TextContent } from "@earendil-works/pi-ai";

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

/**
 * Turn one result into content blocks.
 *
 * An image is sent as an image block rather than a path, because pi passes
 * those through to the model directly. The text alongside it records where the
 * file landed and what was done to it, so a later turn can reach for the
 * original instead of re-fetching.
 */
function toContentBlocks(result: ExtractedContent): (TextContent | ImageContent)[] {
	const { image } = result;
	if (!image) return [{ type: "text", text: renderResult(result) }];

	const original = `${image.originalFormat} ${image.originalWidth}x${image.originalHeight}`;
	const unchanged = image.width === image.originalWidth && image.height === image.originalHeight;
	const described = unchanged ? original : `${original}, resized to ${image.width}x${image.height}`;

	return [
		{ type: "image", data: image.data, mimeType: image.mimeType },
		{ type: "text", text: `Image from ${result.url}\nSaved to: ${image.path}\n${described}` },
	];
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
		images: Type.Optional(
			Type.Boolean({
				description:
					"Also download the images a page contains and save them locally. Off by default; " +
					"enable it when a page's diagrams, charts or screenshots are what matters.",
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

		// Posts whose point is the media they hold are resolved through cobalt
		// first. Generic extraction sees only the surrounding page, which for a
		// Bluesky post is its alt text and for TikTok is nothing at all.
		const mediaUrls = urls.filter(url => isCobaltUrl(url));
		const mediaBlocks: (TextContent | ImageContent)[] = [];
		const mediaFailures: string[] = [];

		for (const url of mediaUrls) {
			const resolved = await resolveMedia(url);
			// A URL cobalt recognises but cannot resolve falls back to generic
			// extraction, which at least returns the page around the media.
			if (!resolved) {
				mediaFailures.push(url);
				continue;
			}
			const fetched = await fetchMedia(resolved, signal);
			if (mediaBlocks.length > 0) mediaBlocks.push({ type: "text", text: "\n\n---\n\n" });
			mediaBlocks.push(...mediaContentBlocks(url, fetched));
		}

		const pageUrls = urls.filter(url => !mediaUrls.includes(url) || mediaFailures.includes(url));

		const allowRanges = getAllowRanges();
		const results =
			pageUrls.length === 0
				? []
				: await extractAll(pageUrls, {
						...(signal ? { signal } : {}),
						...(allowRanges.length > 0 ? { allowRanges } : {}),
						...(params.images ? { includeImages: true } : {}),
					});

		const succeeded = results.filter(result => result.content.length > 0 || result.image).length;

		// Blocks are flattened rather than joined, since an image cannot be
		// represented in the text stream that separates the textual results.
		const pageBlocks = results.flatMap<TextContent | ImageContent>((result, index) =>
			index === 0 ? toContentBlocks(result) : [{ type: "text", text: "\n\n---\n\n" }, ...toContentBlocks(result)],
		);

		const content =
			mediaBlocks.length > 0 && pageBlocks.length > 0
				? [...mediaBlocks, { type: "text" as const, text: "\n\n---\n\n" }, ...pageBlocks]
				: [...mediaBlocks, ...pageBlocks];

		const mediaSucceeded = mediaUrls.length - mediaFailures.length;

		return {
			content,
			details: {
				requested: urls.length,
				succeeded: succeeded + mediaSucceeded,
				failed: urls.length - succeeded - mediaSucceeded,
				...(mediaSucceeded > 0 ? { media: mediaSucceeded } : {}),
				results: results.map(({ url, title, error, wordCount }) => ({ url, title, error, wordCount })),
			},
		};
	},
});
