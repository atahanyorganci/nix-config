/**
 * OpenGraph metadata, as a fallback for pages that do not extract.
 *
 * A single-page app serves a shell and fills it in with script, so the
 * extractor sees navigation and a login wall. Those same pages almost always
 * carry `og:` tags, because that is how they render in a link preview -- and a
 * link preview is exactly the summary that is wanted when the body is
 * unreachable.
 *
 * On X this is the difference between forty lines of login prompts, trending
 * topics and a repeated thread, and the three lines of the post itself.
 */

/** The subset of an element this module needs, so linkedom and the DOM both fit. */
interface MetaElementLike {
	getAttribute(name: string): string | null;
}

interface DocumentLike {
	querySelectorAll(selector: string): Iterable<MetaElementLike>;
}

export interface OpenGraph {
	readonly title?: string;
	readonly description?: string;
	readonly siteName?: string;
	readonly author?: string;
	readonly published?: string;
	readonly image?: string;
}

/**
 * Hosts whose rendered page is never worth extracting.
 *
 * These serve a login wall to anything without a session, so the extractor
 * succeeds in the sense that it returns text, and that text is worthless. The
 * length check alone does not catch them: X's wall is well over the thin
 * threshold once the trending sidebar is counted.
 */
const METADATA_ONLY_HOSTS = new Set([
	"x.com",
	"www.x.com",
	"twitter.com",
	"www.twitter.com",
	"mobile.twitter.com",
	"instagram.com",
	"www.instagram.com",
	"threads.net",
	"www.threads.net",
]);

/** True when a host's rendered page should be skipped in favour of its metadata. */
export function prefersMetadata(url: string): boolean {
	try {
		return METADATA_ONLY_HOSTS.has(new URL(url).hostname.toLowerCase());
	} catch {
		return false;
	}
}

/**
 * Read the `og:`/`twitter:` tags from a parsed document.
 *
 * OpenGraph uses `property`, Twitter's cards use `name`, and plenty of pages
 * mix the two, so both attributes are read into one map. First value wins:
 * `og:title` sits above `twitter:title` in the head when both are present, and
 * the OpenGraph one is the more reliable of the pair.
 */
export function parseOpenGraph(document: DocumentLike): OpenGraph {
	const tags = new Map<string, string>();

	for (const element of document.querySelectorAll("meta")) {
		const key = (element.getAttribute("property") ?? element.getAttribute("name") ?? "").toLowerCase();
		const value = element.getAttribute("content") ?? "";
		if (!key || !value.trim()) continue;
		if (!tags.has(key)) tags.set(key, value.trim());
	}

	const pick = (...keys: string[]): string | undefined => {
		for (const key of keys) {
			const value = tags.get(key);
			if (value) return value;
		}
		return undefined;
	};

	const author = pick("twitter:creator", "article:author", "author");
	const result: OpenGraph = {
		...(pick("og:title", "twitter:title") ? { title: pick("og:title", "twitter:title")! } : {}),
		...(pick("og:description", "twitter:description", "description")
			? { description: pick("og:description", "twitter:description", "description")! }
			: {}),
		...(pick("og:site_name") ? { siteName: pick("og:site_name")! } : {}),
		// A bare handle is more useful with its sigil, and `article:author` is
		// often a profile URL, which is left as-is.
		...(author ? { author } : {}),
		...(pick("article:published_time", "og:article:published_time", "article:modified_time")
			? { published: pick("article:published_time", "og:article:published_time", "article:modified_time")! }
			: {}),
		...(pick("og:image", "twitter:image") ? { image: pick("og:image", "twitter:image")! } : {}),
	};

	return result;
}

/**
 * Below this a description is assumed to be a site-wide tagline rather than
 * anything about the page. It does not apply on a metadata-preferred host,
 * where the description is the post and "i'm dying" is a whole one.
 */
const MIN_DESCRIPTION_CHARS = 40;

/**
 * Does the metadata say anything about this page in particular?
 *
 * A description that merely repeats the title says nothing, whatever its
 * length: that is what a site emits when it has no per-page summary.
 */
export function isUsable(meta: OpenGraph, minChars = MIN_DESCRIPTION_CHARS): boolean {
	const description = meta.description?.trim() ?? "";
	if (description.length < minChars) return false;
	return !meta.title || description !== meta.title.trim();
}

/**
 * Should the metadata replace what the extractor returned?
 *
 * The two reasons for reaching here are not the same, and applying one rule to
 * both gets X wrong. On a metadata-preferred host the extracted text is a
 * login wall, so its length says nothing about its worth -- X's runs to some
 * four thousand characters of prompts, trending topics and a repeated thread,
 * which would outvote a perfectly good description under any ratio.
 *
 * A merely thin extraction is different: there the text is real, just short,
 * and a preview blurb should only displace it if it actually says more.
 */
export function preferMetadata(meta: OpenGraph, extracted: string, hostPrefersMetadata: boolean): boolean {
	// On a walled host the description is the post itself, so the tagline
	// floor does not apply: a nine-character reply is still the whole post,
	// and rejecting it hands the page back to the login wall.
	if (hostPrefersMetadata) return isUsable(meta, 1);
	if (!isUsable(meta)) return false;
	return (meta.description?.trim().length ?? 0) > extracted.trim().length / 4;
}

/**
 * Render metadata as the page's content.
 *
 * The description is the body: on a post it is the post, and on an article it
 * is the standfirst. The image is named rather than embedded, since a preview
 * thumbnail is rarely worth a round trip and the caller can fetch it.
 */
export function renderOpenGraph(meta: OpenGraph): string {
	const parts = [meta.description?.trim() ?? ""];
	if (meta.image) parts.push(`Preview image: ${meta.image}`);
	return parts.filter(Boolean).join("\n\n");
}
