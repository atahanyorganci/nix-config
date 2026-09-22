import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import {
	isUsable,
	parseOpenGraph,
	preferMetadata,
	prefersMetadata,
	renderOpenGraph,
} from "../src/fetch-content/handlers/opengraph.ts";

/** Parsing is pure: a document in, metadata out, with no network involved. */
const parse = (html: string) => parseOpenGraph(parseHTML(html).document as never);

/**
 * The head of a real X post, trimmed to the tags that matter.
 *
 * Kept verbatim -- including the nonce attributes and the `&amp;` in the image
 * URL -- because those are what a parser has to cope with in practice.
 */
const X_POST = `<html><head>
<meta property="og:site_name" content="X (formerly Twitter)" nonce="kahKNN148si+LbTlSd5Xmg=="/>
<meta property="og:url" content="https://x.com/thdxr/status/2102206622000967955" nonce="kahKNN148si+LbTlSd5Xmg=="/>
<meta property="og:title" content="dax (@thdxr) on X" nonce="kahKNN148si+LbTlSd5Xmg=="/>
<meta property="og:description" content="kit finally finished the blog post&#10;&#10;he covers how OpenCode 2.0 is able to modify everything about itself in real time even during running sessions" nonce="kahKNN148si+LbTlSd5Xmg=="/>
<meta name="twitter:title" content="dax (@thdxr) on X" nonce="kahKNN148si+LbTlSd5Xmg=="/>
<meta property="og:image" content="https://pbs.twimg.com/card_img/2102206618372878336/5yG4f7gS?format=webp&amp;name=medium" nonce="kahKNN148si+LbTlSd5Xmg=="/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:site" content="@x"/>
<meta name="twitter:creator" content="@thdxr"/>
</head><body>
<div id="react-root"><span>Log in</span><span>Sign up</span><span>Trending now</span></div>
</body></html>`;

describe("parsing", () => {
	it("reads a post's text out of the head", () => {
		// This is the whole point: the body is a login wall, and the post is
		// sitting in a meta tag above it.
		expect(parse(X_POST).description).toContain("kit finally finished the blog post");
	});

	it("reads title, site and author", () => {
		const meta = parse(X_POST);
		expect(meta.title).toBe("dax (@thdxr) on X");
		expect(meta.siteName).toBe("X (formerly Twitter)");
		expect(meta.author).toBe("@thdxr");
	});

	it("decodes entities rather than passing them through", () => {
		expect(parse(X_POST).image).toContain("?format=webp&name=medium");
		expect(parse(X_POST).image).not.toContain("&amp;");
	});

	it("reads both property and name attributes", () => {
		// OpenGraph uses property, Twitter's cards use name, and pages mix them.
		const meta = parse('<meta name="twitter:title" content="From name"/>');
		expect(meta.title).toBe("From name");
	});

	it("prefers the OpenGraph tag when both are present", () => {
		const meta = parse('<meta property="og:title" content="OpenGraph"/><meta name="twitter:title" content="Twitter"/>');
		expect(meta.title).toBe("OpenGraph");
	});

	it("falls back to a plain description", () => {
		const meta = parse('<meta name="description" content="A plain description."/>');
		expect(meta.description).toBe("A plain description.");
	});

	it("ignores a tag with an empty value", () => {
		expect(parse('<meta property="og:title" content="   "/>').title).toBeUndefined();
	});

	it("returns nothing for a document with no metadata", () => {
		expect(parse("<html><body><p>Hi</p></body></html>")).toEqual({});
	});

	it("reads an article's publication date", () => {
		const meta = parse('<meta property="article:published_time" content="2026-09-22T01:21:30.000Z"/>');
		expect(meta.published).toBe("2026-09-22T01:21:30.000Z");
	});
});

describe("host preferences", () => {
	it.each(["https://x.com/thdxr/status/1", "https://twitter.com/thdxr/status/1", "https://www.instagram.com/p/abc/"])(
		"prefers metadata for %s",
		url => {
			// These serve a login wall to anything without a session, so the
			// extracted text is long enough to look like success and is worthless.
			expect(prefersMetadata(url)).toBe(true);
		},
	);

	it.each(["https://example.com/post", "https://en.wikipedia.org/wiki/Nix"])("extracts %s normally", url => {
		expect(prefersMetadata(url)).toBe(false);
	});

	it("does not match a lookalike host", () => {
		expect(prefersMetadata("https://x.com.evil.example/a")).toBe(false);
	});

	it("says no for a string that is not a URL", () => {
		expect(prefersMetadata("not a url")).toBe(false);
	});
});

describe("usability", () => {
	it("accepts a description that says something", () => {
		expect(isUsable(parse(X_POST))).toBe(true);
	});

	it("rejects a tagline too short to be a summary", () => {
		expect(isUsable({ description: "A social network." })).toBe(false);
	});

	it("accepts a short description when the caller lowers the floor", () => {
		expect(isUsable({ description: "i'm dying" }, 1)).toBe(true);
	});

	it("rejects a description that merely repeats the title", () => {
		const title = "Some page title that is long enough to pass the length check";
		expect(isUsable({ title, description: title })).toBe(false);
	});

	it("rejects absent metadata", () => {
		expect(isUsable({})).toBe(false);
	});
});

describe("choosing metadata over extraction", () => {
	it("takes the metadata on a walled host however long the wall is", () => {
		// X's login wall runs to some four thousand characters of prompts,
		// trending topics and a repeated thread. Length is no measure of its
		// worth, so a ratio would hand the page back to the wall.
		expect(preferMetadata(parse(X_POST), "x".repeat(4_000), true)).toBe(true);
	});

	it("still refuses useless metadata on a walled host", () => {
		// Preferring metadata is not the same as accepting anything: with no
		// description there is nothing to prefer.
		expect(preferMetadata({ title: "X" }, "Log in", true)).toBe(false);
	});

	it("keeps a very short post, which the tagline floor would reject", () => {
		// A reply of "i'm dying" is the entire post. Holding it to the length
		// expected of an article summary hands the page back to the wall.
		const meta = { title: "David Hill (@iamdavidhill) on X", description: "i'm dying" };
		expect(preferMetadata(meta, "x".repeat(4_000), true)).toBe(true);
	});

	it("still rejects a description that only repeats the title on a walled host", () => {
		const meta = { title: "David Hill on X", description: "David Hill on X" };
		expect(preferMetadata(meta, "Log in", true)).toBe(false);
	});

	it("takes the metadata when a thin extraction says less", () => {
		expect(preferMetadata(parse(X_POST), "Loading...", false)).toBe(true);
	});

	it("keeps a real article over its preview blurb", () => {
		// Here the extracted text is genuine, just short, and the blurb must
		// not displace it.
		const meta = { description: "A summary of the article, long enough to be considered usable here." };
		expect(preferMetadata(meta, "x".repeat(10_000), false)).toBe(false);
	});
});

describe("rendering", () => {
	it("uses the description as the body", () => {
		expect(renderOpenGraph(parse(X_POST))).toContain("kit finally finished the blog post");
	});

	it("names the preview image rather than embedding it", () => {
		// A preview thumbnail is rarely worth a round trip, and the caller can
		// fetch it if it turns out to matter.
		expect(renderOpenGraph(parse(X_POST))).toContain("Preview image: https://pbs.twimg.com/card_img/");
	});

	it("carries none of the login wall", () => {
		const rendered = renderOpenGraph(parse(X_POST));
		expect(rendered).not.toMatch(/Log in|Sign up|Trending now/);
	});
});
