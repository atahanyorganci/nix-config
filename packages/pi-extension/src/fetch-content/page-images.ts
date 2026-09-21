/**
 * Finding the images that belong to an article.
 *
 * This works from the parsed document rather than the extracted markdown,
 * because the extractor rewrites image sources to whatever the page links to.
 * On Wikipedia that is the file's description page, which serves HTML: the
 * markdown looks like it carries images while none of its URLs are images.
 */

/** An `<img>` worth downloading, with the text that explains it. */
export interface PageImage {
	readonly src: string;
	readonly alt: string;
}

/** Directories that hold interface furniture rather than article content. */
const CHROME_DIR_PATTERN = /\/(?:icons?|logos?|sprites?|avatars?|badges?|emoji|buttons?|funders?|sponsors?|ads?)\//i;

/**
 * Path prefixes that mark a site's own assets.
 *
 * A page's furniture is served from a static asset root while its content
 * comes from a media or upload host, so the prefix separates the two more
 * reliably than any single directory name. This is what keeps arXiv's logo
 * and funder badges out while leaving the figures in.
 */
const ASSET_ROOT_PATTERN = /^\/(?:static|assets?|dist|build|theme|skin|wp-(?:content\/themes|includes))\//i;

/** File names that mark branding, tracking pixels and layout shims. */
const CHROME_FILE_PATTERN =
	/(?:^|[/_-])(?:pixel|beacon|spacer|blank|transparent|1x1|logo|wordmark|icon|sprite|avatar|banner)(?:[._-]|$)/i;

/** Below this, on either axis, an image is decoration rather than content. */
const MIN_DIMENSION = 100;

/** Default ceiling on how many images one page may contribute. */
export const DEFAULT_IMAGE_LIMIT = 8;

/**
 * Pick the largest candidate out of a srcset.
 *
 * Responsive images often point `src` at a small placeholder and keep the
 * real sizes here, so taking the widest descriptor gets a usable image where
 * `src` alone would get a thumbnail.
 */
function largestFromSrcset(srcset: string): string | null {
	let best: { url: string; width: number } | null = null;
	for (const candidate of srcset.split(",")) {
		const [url, descriptor] = candidate.trim().split(/\s+/);
		if (!url) continue;
		const width = Number(/^(\d+)w$/.exec(descriptor ?? "")?.[1] ?? 0);
		if (!best || width > best.width) best = { url, width };
	}
	return best?.url ?? null;
}

/** The subset of an element this module needs, so linkedom and the DOM both fit. */
interface ImageElementLike {
	getAttribute(name: string): string | null;
}

interface DocumentLike {
	querySelectorAll(selector: string): Iterable<ImageElementLike>;
}

/**
 * Collect the content images from a parsed document.
 *
 * The filtering is deliberately blunt. A page's chrome outnumbers its real
 * images, every false positive costs a request and a conversion, and missing
 * one image is a far smaller loss than burying the result in navigation
 * icons. Anything that survives is still capped.
 */
export function collectPageImages(document: DocumentLike, baseUrl: string, limit = DEFAULT_IMAGE_LIMIT): PageImage[] {
	const seen = new Set<string>();
	const images: PageImage[] = [];

	for (const element of document.querySelectorAll("img")) {
		if (images.length >= limit) break;

		const srcset = element.getAttribute("srcset") ?? element.getAttribute("data-srcset") ?? "";
		// `data-src` carries the real URL on lazy-loaded images, whose `src`
		// holds a placeholder until script runs.
		const raw =
			(srcset ? largestFromSrcset(srcset) : null) ??
			element.getAttribute("src") ??
			element.getAttribute("data-src") ??
			"";
		if (!raw) continue;

		// Data URIs are already inline, and are used for exactly the sort of
		// icon this is trying to skip.
		if (raw.startsWith("data:")) continue;

		// Protocol-relative sources are common on large sites and resolve
		// against the page's scheme, which `new URL` handles given the base.
		let resolved: URL;
		try {
			resolved = new URL(raw, baseUrl);
		} catch {
			continue;
		}
		if (resolved.protocol !== "http:" && resolved.protocol !== "https:") continue;

		const href = resolved.toString();
		if (seen.has(href)) continue;
		const path = resolved.pathname;
		if (CHROME_DIR_PATTERN.test(path) || CHROME_FILE_PATTERN.test(path) || ASSET_ROOT_PATTERN.test(path)) {
			continue;
		}

		// Declared dimensions are the cheapest way to drop spacers and icons,
		// since they rule an image out without fetching it. An undeclared
		// dimension says nothing, so it is not held against the candidate.
		const width = Number(element.getAttribute("width"));
		const height = Number(element.getAttribute("height"));
		if (Number.isFinite(width) && width > 0 && width < MIN_DIMENSION) continue;
		if (Number.isFinite(height) && height > 0 && height < MIN_DIMENSION) continue;

		seen.add(href);
		images.push({ src: href, alt: (element.getAttribute("alt") ?? "").trim() });
	}

	return images;
}
