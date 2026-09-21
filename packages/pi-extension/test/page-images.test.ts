import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import { collectPageImages } from "../src/fetch-content/page-images.ts";

const BASE = "https://example.com/articles/one";

/** Collect from a body fragment, which is all these cases need. */
function collect(body: string, limit?: number) {
	const { document } = parseHTML(`<html><body>${body}</body></html>`);
	return collectPageImages(document, BASE, limit);
}

const sources = (body: string, limit?: number) => collect(body, limit).map(image => image.src);

describe("URL resolution", () => {
	it("resolves a root-relative source against the page", () => {
		expect(sources(`<img src="/media/diagram.png">`)).toEqual(["https://example.com/media/diagram.png"]);
	});

	it("resolves a document-relative source against the page", () => {
		expect(sources(`<img src="diagram.png">`)).toEqual(["https://example.com/articles/diagram.png"]);
	});

	it("resolves a protocol-relative source to the page's scheme", () => {
		// The form large sites actually serve; left alone it is not a URL.
		expect(sources(`<img src="//cdn.example.org/media/photo.jpg">`)).toEqual([
			"https://cdn.example.org/media/photo.jpg",
		]);
	});

	it("keeps an absolute source as-is", () => {
		expect(sources(`<img src="https://cdn.example.org/a/photo.jpg">`)).toEqual(["https://cdn.example.org/a/photo.jpg"]);
	});

	it("skips a source that cannot be parsed", () => {
		expect(sources(`<img src="http://[bad">`)).toEqual([]);
	});

	it("skips non-HTTP schemes", () => {
		expect(sources(`<img src="file:///etc/passwd">`)).toEqual([]);
	});
});

describe("filtering", () => {
	it("skips data URIs", () => {
		// Already inline, and the form icons are usually delivered in.
		expect(sources(`<img src="data:image/gif;base64,R0lGOD">`)).toEqual([]);
	});

	it("skips chrome directories", () => {
		const body = `
			<img src="/media/icons/edit.png">
			<img src="/media/emoji/smile.png">
			<img src="/media/funders/university.png">
			<img src="/media/content.png">`;
		expect(sources(body)).toEqual(["https://example.com/media/content.png"]);
	});

	it("skips a site's static asset root", () => {
		// Where a page's own furniture lives. arXiv serves its logo and funder
		// badges from here while figures come from elsewhere, and no single
		// directory name separates the two.
		const body = `
			<img src="/static/base/images/masthead.png">
			<img src="/assets/img/header.png">
			<img src="/uploads/2024/figure.png">`;
		expect(sources(body)).toEqual(["https://example.com/uploads/2024/figure.png"]);
	});

	it("skips branding by file name, wherever it is served from", () => {
		// Wikipedia's wordmark sits under a path no directory rule would catch.
		const body = `
			<img src="/media/wikipedia-wordmark-en.svg">
			<img src="/media/company-logo.png">
			<img src="/media/screenshot.png">`;
		expect(sources(body)).toEqual(["https://example.com/media/screenshot.png"]);
	});

	it("skips tracking pixels and layout shims", () => {
		const body = `
			<img src="/t/pixel.gif">
			<img src="/img/spacer.gif">
			<img src="/img/1x1.png">
			<img src="/media/real.png">`;
		expect(sources(body)).toEqual(["https://example.com/media/real.png"]);
	});

	it("skips images declared too small to be content", () => {
		const body = `
			<img src="/media/tiny.png" width="16" height="16">
			<img src="/media/big.png" width="800" height="600">`;
		expect(sources(body)).toEqual(["https://example.com/media/big.png"]);
	});

	it("keeps an image with no declared dimensions", () => {
		// An absent dimension is unknown, not small, and most pages omit them.
		expect(sources(`<img src="/media/unknown.png">`)).toEqual(["https://example.com/media/unknown.png"]);
	});

	it("keeps an image whose declared dimensions are unparseable", () => {
		expect(sources(`<img src="/media/pct.png" width="100%">`)).toEqual(["https://example.com/media/pct.png"]);
	});

	it("deduplicates repeated sources", () => {
		const body = `<img src="/media/a.png"><img src="/media/a.png">`;
		expect(sources(body)).toHaveLength(1);
	});

	it("ignores an img with no usable source at all", () => {
		expect(sources(`<img alt="broken">`)).toEqual([]);
	});
});

describe("responsive and lazy sources", () => {
	it("takes the widest candidate from a srcset", () => {
		// src often points at a placeholder while srcset holds the real sizes.
		const body = `<img src="/media/small.png" srcset="/media/small.png 320w, /media/large.png 1600w">`;
		expect(sources(body)).toEqual(["https://example.com/media/large.png"]);
	});

	it("falls back to data-src when src is absent", () => {
		expect(sources(`<img data-src="/media/lazy.png">`)).toEqual(["https://example.com/media/lazy.png"]);
	});

	it("reads a data-srcset", () => {
		const body = `<img data-srcset="/media/a.png 200w, /media/b.png 900w">`;
		expect(sources(body)).toEqual(["https://example.com/media/b.png"]);
	});
});

describe("alt text and limits", () => {
	it("keeps alt text, trimmed", () => {
		const images = collect(`<img src="/media/a.png" alt="  Architecture diagram  ">`);
		expect(images[0]?.alt).toBe("Architecture diagram");
	});

	it("reports an empty alt rather than inventing one", () => {
		expect(collect(`<img src="/media/a.png">`)[0]?.alt).toBe("");
	});

	it("stops at the limit", () => {
		const body = Array.from({ length: 20 }, (_, index) => `<img src="/media/${index}.png">`).join("");
		expect(collect(body, 3)).toHaveLength(3);
	});
});
