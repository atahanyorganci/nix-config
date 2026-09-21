import { describe, expect, it } from "vitest";
import { fetchGithubPage, hasGhCli, isGithubUrl, matchRoute, rawUrlFor } from "../src/fetch-content/handlers/github.ts";

/** Routing is pure and offline, so it is tested without touching the API. */
const kindOf = (pathname: string) => matchRoute(pathname)?.kind ?? null;

describe("route matching", () => {
	it.each([
		["/owner/repo/pull/123", "pull"],
		["/owner/repo/issues/9", "issue"],
		["/owner/repo/commit/ba515bd9", "commit"],
		["/owner/repo/compare/v1...v2", "compare"],
		["/owner/repo/releases/tag/v2.1.0", "release"],
		["/owner/repo/blob/main/src/index.ts", "blob"],
		["/owner/repo/tree/main/src", "tree"],
		["/owner/repo", "repo"],
		["/owner/repo/", "repo"],
	])("identifies %s as %s", (pathname, kind) => {
		expect(kindOf(pathname)).toBe(kind);
	});

	it.each(["/owner/repo/pull/1", "/owner/repo/tree/main", "/owner/repo/issues/2"])(
		"does not fall back to the repo route for %s",
		pathname => {
			// The repo pattern is anchored at the end, which is what stops it
			// matching a longer path regardless of where it sits in the list.
			expect(kindOf(pathname)).not.toBe("repo");
		},
	);

	it("extracts the parts of a pull request URL", () => {
		expect(matchRoute("/imputnet/cobalt/pull/1594")).toMatchObject({
			kind: "pull",
			owner: "imputnet",
			repo: "cobalt",
			rest: "1594",
		});
	});

	it("keeps a repo root's owner and name despite having nothing after them", () => {
		// The repo pattern captures no third group, which must not be mistaken
		// for a failed match.
		expect(matchRoute("/NixOS/nix")).toMatchObject({ kind: "repo", owner: "NixOS", repo: "nix" });
	});

	it("separates a blob's ref from its path", () => {
		expect(matchRoute("/NixOS/nix/blob/master/src/libutil/url.cc")).toMatchObject({
			rest: "master",
			path: "src/libutil/url.cc",
		});
	});

	it("handles a tree URL with no path", () => {
		expect(matchRoute("/owner/repo/tree/main")).toMatchObject({ kind: "tree", rest: "main" });
	});

	it("decodes percent-escaped refs", () => {
		expect(matchRoute("/owner/repo/releases/tag/v1.0%2Bbuild")?.rest).toBe("v1.0+build");
	});

	it("strips a .git suffix from the repository name", () => {
		expect(matchRoute("/owner/repo.git")?.repo).toBe("repo");
	});

	it.each(["/settings", "/marketplace/actions/checkout", "/orgs/NixOS", "/topics/nix", "/about"])(
		"refuses the site's own page %s",
		pathname => {
			// These are repository-shaped but are GitHub features, and the API
			// has nothing to say about them.
			expect(matchRoute(pathname)).toBeNull();
		},
	);

	it("ignores a path that is not a repository at all", () => {
		expect(matchRoute("/")).toBeNull();
	});
});

describe("host matching", () => {
	it.each(["https://github.com/owner/repo/pull/1", "https://www.github.com/owner/repo"])("accepts %s", url => {
		expect(isGithubUrl(new URL(url))).toBe(true);
	});

	it.each([
		"https://gitlab.com/owner/repo",
		"https://raw.githubusercontent.com/owner/repo/main/a.txt",
		"https://github.com.evil.example/owner/repo",
		"https://github.io/owner/repo",
	])("rejects %s", url => {
		expect(isGithubUrl(new URL(url))).toBe(false);
	});

	it("rejects a GitHub URL that is not a recognised page", () => {
		expect(isGithubUrl(new URL("https://github.com/settings/profile"))).toBe(false);
	});
});

describe("missing gh", () => {
	const original = process.env.FETCH_CONTENT_GH;
	const withoutGh = async <T>(body: () => Promise<T>): Promise<T> => {
		process.env.FETCH_CONTENT_GH = "/nonexistent/gh";
		try {
			return await body();
		} finally {
			if (original === undefined) delete process.env.FETCH_CONTENT_GH;
			else process.env.FETCH_CONTENT_GH = original;
		}
	};

	it("reports gh as unavailable rather than throwing", async () => {
		await expect(withoutGh(hasGhCli)).resolves.toBe(false);
	});

	it("throws from the page fetch so the caller can fall back", async () => {
		// The generic path is a worse answer than the API's, but a far better
		// one than an error, so this failure has to be catchable.
		const route = matchRoute("/owner/repo/pull/1")!;
		await expect(withoutGh(async () => await fetchGithubPage(route))).rejects.toThrow();
	});
});

describe("raw URLs", () => {
	it("rewrites a blob to the raw host", () => {
		// The rendered blob page extracts as its own line-number gutter, so the
		// file has to come from somewhere that serves the bytes.
		const route = matchRoute("/NixOS/nix/blob/master/src/libutil/url.cc")!;
		expect(rawUrlFor(route)).toBe("https://raw.githubusercontent.com/NixOS/nix/master/src/libutil/url.cc");
	});

	it("keeps a nested path intact", () => {
		const route = matchRoute("/owner/repo/blob/v1.0/a/b/c.md")!;
		expect(rawUrlFor(route)).toBe("https://raw.githubusercontent.com/owner/repo/v1.0/a/b/c.md");
	});
});
