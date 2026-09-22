import { Type } from "@earendil-works/pi-ai";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { isCobaltUrl, resolveMedia } from "./cobalt.ts";
import { extractContent } from "./extract.ts";
import { fetchMedia, mediaResult } from "./media.ts";
import { facts, joinResults } from "./render.ts";
import type { ExtractedContent, ExtractOptions } from "./extract.ts";
import type { FetchResult } from "./render.ts";

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

/**
 * Describe an extracted page as a result.
 *
 * Everything the extractor learned is reported here. Several of these were
 * computed and then dropped: a fifty-page PDF that fitted inline never said it
 * had fifty pages, because the old renderer only printed author and date.
 */
function pageResult(result: ExtractedContent): FetchResult {
	const { image } = result;

	const described = image
		? image.width === image.originalWidth && image.height === image.originalHeight
			? `${image.originalFormat} ${image.originalWidth}x${image.originalHeight}`
			: `${image.originalFormat} ${image.originalWidth}x${image.originalHeight},` +
				` resized to ${image.width}x${image.height}`
		: "";

	return {
		url: result.url,
		title: result.title,
		content: result.content,
		error: result.error,
		facts: facts(
			result.author ? { label: "Author", value: result.author } : null,
			result.published ? { label: "Published", value: result.published } : null,
			result.siteName ? { label: "Site", value: result.siteName } : null,
			result.pageCount === undefined ? null : { label: "Pages", value: String(result.pageCount) },
			result.wordCount === undefined ? null : { label: "Words", value: result.wordCount.toLocaleString("en-US") },
			image ? { label: "Image", value: described } : null,
			image ? { label: "Saved to", value: image.path } : null,
			result.artifactDir ? { label: "Artifacts", value: result.artifactDir } : null,
		),
		...(image ? { images: [{ type: "image" as const, data: image.data, mimeType: image.mimeType }] } : {}),
	};
}

/**
 * Fetch one URL, taking the media behind it and the page around it together.
 *
 * These used to be exclusive: a URL cobalt resolved was removed from the page
 * list entirely, so a post with a photo returned the photo and lost the text
 * that explained it, while a post cobalt declined returned the page's login
 * wall and lost nothing only because there was no media to lose. An X post is
 * both things, and neither path on its own answers what was asked.
 */
async function fetchOne(url: string, options: ExtractOptions): Promise<FetchResult> {
	if (!isCobaltUrl(url)) return pageResult(await extractContent(url, options));

	// Both legs run together: the media download is the slow one, and making
	// the page wait for it would double the latency of every social URL.
	const [media, page] = await Promise.all([
		resolveMedia(url)
			.then(async resolved => (resolved ? await fetchMedia(resolved, options.signal) : null))
			.catch(() => null),
		// A post whose media resolves still has text worth reading, and a
		// failure here must not cost the media.
		extractContent(url, options).catch(() => null),
	]);

	if (!media) {
		// Cobalt declined, which is the common case for a text-only post.
		return pageResult(page ?? { url, title: "", content: "", error: "Could not fetch" });
	}

	const mediaSide = mediaResult(url, media);
	const pageSide = page && page.content.trim() ? pageResult(page) : null;
	if (!pageSide) return mediaSide;

	// The page supplies what the post says; the media supplies what it shows.
	return {
		...pageSide,
		error: pageSide.error ?? mediaSide.error,
		facts: facts(...(mediaSide.facts ?? []), ...(pageSide.facts ?? [])),
		...(mediaSide.images ? { images: mediaSide.images } : {}),
		...(mediaSide.attachments ? { attachments: mediaSide.attachments } : {}),
	};
}

/**
 * Fetch several URLs with bounded concurrency, preserving input order.
 *
 * The cap keeps a large batch from opening dozens of sockets at once. Order is
 * the caller's: results used to come back media-first, so a two-URL call could
 * answer them in the opposite order to the one asked.
 */
async function fetchAll(urls: readonly string[], options: ExtractOptions, concurrency = 5): Promise<FetchResult[]> {
	const results: FetchResult[] = Array.from({ length: urls.length });
	let next = 0;

	const worker = async () => {
		for (;;) {
			const index = next++;
			if (index >= urls.length) return;
			results[index] = await fetchOne(urls[index]!, options);
		}
	};

	await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
	return results;
}

export const fetchContent = defineTool({
	name: "fetch_content",
	label: "Fetch Content",
	// The model cannot tell from a URL whether this tool will help, so the
	// description names the cases that are not obvious -- media posts, PDFs and
	// GitHub -- and says what comes back for each. Without that it falls back to
	// treating every URL as an article and gives up on the ones that are not.
	description:
		"Fetch one or more URLs and return their content, chosen by what the URL points at:\n" +
		"- Web pages: main content as markdown, with navigation, ads and boilerplate removed.\n" +
		"- Images: returned directly as an image, downscaled to fit.\n" +
		"- PDFs: extracted text, plus embedded figures as images. Long documents are written to files instead.\n" +
		"- GitHub pages: read through the API, so pull requests, issues, commits, releases and file " +
		"contents come back as structured text rather than rendered HTML.\n" +
		"- Social media posts (TikTok, Instagram, Bluesky, Reddit, X, Vimeo, SoundCloud and others): the " +
		"media itself rather than the page around it. Photos are returned as images; video and audio are " +
		"downloaded and their file paths reported, since they cannot be returned inline.",
	promptSnippet: "Use to read a web page, image, PDF, GitHub page, or the media behind a social media post, by URL.",
	parameters: Type.Object({
		url: Type.Optional(Type.String({ description: "A single URL to fetch. Provide either this or urls." })),
		urls: Type.Optional(
			Type.Array(Type.String(), {
				minItems: 1,
				maxItems: 10,
				description:
					"Several URLs to fetch in parallel. Prefer this over repeated calls; " +
					"one URL failing does not affect the others.",
			}),
		),
		images: Type.Optional(
			Type.Boolean({
				description:
					"Also download the images a web page contains and save them locally. Off by default; " +
					"enable it when a page's diagrams, charts or screenshots are what matters. Does not " +
					"apply to image, PDF or social media URLs, which already return their images.",
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
		const results = await fetchAll(urls, {
			...(signal ? { signal } : {}),
			...(allowRanges.length > 0 ? { allowRanges } : {}),
			...(params.images ? { includeImages: true } : {}),
		});

		// A result counts as a success when it carries something to read or look
		// at, which is not the same as having no error: a thin extraction reports
		// both content and a warning.
		const succeeded = results.filter(
			result =>
				result.content.trim().length > 0 || (result.images?.length ?? 0) > 0 || (result.attachments?.length ?? 0) > 0,
		).length;

		return {
			// Blocks are flattened rather than joined, since an image cannot be
			// represented in the text stream that separates the textual results.
			content: joinResults(results),
			details: {
				requested: urls.length,
				succeeded,
				failed: urls.length - succeeded,
				// Every URL is reported, media included. The counts derive from this
				// array rather than being tallied separately, so they cannot disagree
				// with it.
				results: results.map(result => ({
					url: result.url,
					title: result.title,
					error: result.error,
					...(result.attachments?.length ? { attachments: result.attachments.map(a => a.path) } : {}),
				})),
			},
		};
	},
});
