import { execFile } from "node:child_process";
import { promisify } from "node:util";

/**
 * GitHub pages, fetched through the API instead of the rendered HTML.
 *
 * Generic extraction loses most of what makes these pages useful. A pull
 * request comes back as its description alone, without state, branches, files
 * or reviews, and a source file comes back as the line-number gutter rather
 * than the code.
 */

const run = promisify(execFile);

/**
 * Read at call time, not at import.
 *
 * A constant captured when the module loads cannot be overridden afterwards,
 * which silently ignores the environment in anything that sets it later.
 */
const gh = () => process.env.FETCH_CONTENT_GH ?? "gh";

/** Caps, so one long-running thread cannot become an unbounded result. */
const MAX_COMMITS = 50;
const MAX_FILES = 100;
const MAX_COMMENTS = 20;

export interface GithubRoute {
	readonly kind: "pull" | "issue" | "commit" | "compare" | "release" | "blob" | "tree" | "repo";
	readonly owner: string;
	readonly repo: string;
	/** Number, ref, range or path, depending on the kind. */
	readonly rest: string;
	/** Path within the repository, for blob and tree URLs. */
	readonly path?: string;
}

/**
 * Recognised page shapes, most specific first.
 *
 * The repo pattern is last by convention rather than necessity: it is anchored
 * with `$`, so it cannot match a longer path even if it were tried first. The
 * anchor is what does the work, and removing it would make this order
 * load-bearing.
 */
const ROUTES = [
	{ kind: "pull", pattern: /^\/([^/]+)\/([^/]+)\/pull\/(\d+)/ },
	{ kind: "issue", pattern: /^\/([^/]+)\/([^/]+)\/issues\/(\d+)/ },
	{ kind: "commit", pattern: /^\/([^/]+)\/([^/]+)\/commit\/([0-9a-fA-F]{7,40})/ },
	{ kind: "compare", pattern: /^\/([^/]+)\/([^/]+)\/compare\/(.+)/ },
	{ kind: "release", pattern: /^\/([^/]+)\/([^/]+)\/releases\/tag\/(.+)/ },
	{ kind: "blob", pattern: /^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/ },
	{ kind: "tree", pattern: /^\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.*))?$/ },
	{ kind: "repo", pattern: /^\/([^/]+)\/([^/]+)\/?$/ },
] as const;

/** Repository-shaped paths that are really site features. */
const RESERVED_OWNERS = new Set([
	"about",
	"apps",
	"blog",
	"collections",
	"enterprise",
	"events",
	"explore",
	"features",
	"marketplace",
	"notifications",
	"orgs",
	"pricing",
	"pulls",
	"search",
	"security",
	"settings",
	"sponsors",
	"topics",
	"trending",
]);

/** Identify a GitHub page from its path, or return null if it is not one. */
export function matchRoute(pathname: string): GithubRoute | null {
	for (const { kind, pattern } of ROUTES) {
		const match = pattern.exec(pathname);
		if (!match) continue;

		const [, owner, repo, rest, path] = match;
		if (!owner || !repo) continue;
		if (RESERVED_OWNERS.has(owner.toLowerCase())) return null;

		// A repo root has nothing after the name, so `rest` is legitimately
		// absent there and must not be mistaken for a failed match. Every other
		// route needs it.
		if (!rest && kind !== "repo") continue;

		return {
			kind,
			owner,
			repo: repo.replace(/\.git$/, ""),
			rest: rest ? decodeURIComponent(rest) : "",
			...(path ? { path: decodeURIComponent(path) } : {}),
		};
	}
	return null;
}

/** True for URLs this module should handle instead of the generic path. */
export function isGithubUrl(url: URL): boolean {
	return (url.hostname === "github.com" || url.hostname === "www.github.com") && matchRoute(url.pathname) !== null;
}

/** Where a blob's raw bytes live, which is where the file actually is. */
export function rawUrlFor(route: GithubRoute): string {
	const path = route.path ?? "";
	return `https://raw.githubusercontent.com/${route.owner}/${route.repo}/${route.rest}/${path}`;
}

/**
 * Query the GitHub API through `gh`.
 *
 * Shelling out rather than calling REST directly means the user's existing
 * credentials are used without this code ever handling a token, and it lifts
 * the rate limit from 60 requests an hour to 5,000 while making private
 * repositories reachable.
 */
async function ghApi<T>(path: string, signal?: AbortSignal): Promise<T> {
	const { stdout } = await run(gh(), ["api", "-H", "Accept: application/vnd.github+json", path], {
		...(signal ? { signal } : {}),
		maxBuffer: 16 * 1024 * 1024,
	});
	return JSON.parse(stdout) as T;
}

/** Fetch an endpoint, returning null instead of throwing when it is absent. */
async function ghApiOptional<T>(path: string, signal?: AbortSignal): Promise<T | null> {
	try {
		return await ghApi<T>(path, signal);
	} catch {
		// Reviews on an issue, a README in an empty repo: a missing sub-resource
		// is normal and must not cost the main result.
		return null;
	}
}

/** Is `gh` present and authenticated? */
export async function hasGhCli(): Promise<boolean> {
	try {
		await run(gh(), ["auth", "status"], { timeout: 5_000 });
		return true;
	} catch {
		return false;
	}
}

interface User {
	login?: string;
}

interface FileEntry {
	filename?: string;
	status?: string;
	additions?: number;
	deletions?: number;
}

interface CommitEntry {
	sha?: string;
	commit?: { message?: string; author?: { name?: string; date?: string } };
}

interface Comment {
	user?: User;
	body?: string;
	created_at?: string;
}

/** One-line summary of a changed file: what happened to it and how much. */
function renderFiles(files: readonly FileEntry[]): string[] {
	return files
		.slice(0, MAX_FILES)
		.map(
			file =>
				`- ${file.status ?? "changed"} ${file.filename ?? "?"} +${file.additions ?? 0} \u2212${file.deletions ?? 0}`,
		);
}

function renderCommits(commits: readonly CommitEntry[]): string[] {
	return commits.slice(0, MAX_COMMITS).map(entry => {
		const subject = entry.commit?.message?.split("\n")[0] ?? "";
		return `- ${entry.sha?.slice(0, 8) ?? "?"} ${subject}`;
	});
}

function renderComments(comments: readonly Comment[]): string[] {
	return comments.slice(0, MAX_COMMENTS).map(comment => {
		const body = (comment.body ?? "").trim();
		return `**${comment.user?.login ?? "someone"}**\n\n${body}`;
	});
}

/** Join sections, dropping the ones that turned out to be empty. */
function sections(...parts: (string | null | undefined)[]): string {
	return parts.filter((part): part is string => Boolean(part && part.trim())).join("\n\n");
}

function list(heading: string, entries: readonly string[], separator = "\n"): string | null {
	return entries.length > 0 ? `## ${heading}\n\n${entries.join(separator)}` : null;
}

/**
 * A page's title and body, kept apart.
 *
 * The body carries no heading of its own: the shared renderer adds one from
 * `title`, and a provider that emitted its own would have it printed twice.
 */
export interface GithubPage {
	readonly title: string;
	readonly content: string;
}

interface PullRequest {
	title?: string;
	state?: string;
	draft?: boolean;
	merged?: boolean;
	user?: User;
	head?: { ref?: string };
	base?: { ref?: string };
	additions?: number;
	deletions?: number;
	changed_files?: number;
	commits?: number;
	body?: string;
}

/**
 * Render a pull request.
 *
 * Diff hunks are deliberately left out. The files endpoint returns a patch per
 * file, which on even a small change runs to thousands of characters and
 * crowds out the description and review that explain it. File names with their
 * own counts convey the shape of a change without its volume, and a caller who
 * needs the diff can fetch the file.
 */
async function fetchPull(route: GithubRoute, signal?: AbortSignal): Promise<GithubPage> {
	const base = `repos/${route.owner}/${route.repo}/pulls/${route.rest}`;
	const pull = await ghApi<PullRequest>(base, signal);

	const [files, commits, reviews, comments] = await Promise.all([
		ghApiOptional<FileEntry[]>(`${base}/files?per_page=${MAX_FILES}`, signal),
		ghApiOptional<CommitEntry[]>(`${base}/commits?per_page=${MAX_COMMITS}`, signal),
		ghApiOptional<{ user?: User; state?: string }[]>(`${base}/reviews`, signal),
		ghApiOptional<Comment[]>(
			`repos/${route.owner}/${route.repo}/issues/${route.rest}/comments?per_page=${MAX_COMMENTS}`,
			signal,
		),
	]);

	const state = pull.merged ? "merged" : pull.draft ? "draft" : (pull.state ?? "unknown");
	const title = pull.title ?? `Pull request #${route.rest}`;

	return {
		title,
		content: sections(
			[
				`${route.owner}/${route.repo} #${route.rest} \u2014 ${state}`,
				`${pull.user?.login ?? "someone"} wants to merge ${pull.head?.ref ?? "?"} into ${pull.base?.ref ?? "?"}`,
				`+${pull.additions ?? 0} \u2212${pull.deletions ?? 0} across ${pull.changed_files ?? 0} file(s),` +
					` ${pull.commits ?? 0} commit(s)`,
			].join("\n"),
			pull.body?.trim() ? `## Description\n\n${pull.body.trim()}` : null,
			list("Commits", renderCommits(commits ?? [])),
			list("Files changed", renderFiles(files ?? [])),
			list(
				"Reviews",
				(reviews ?? []).map(review => `- ${review.user?.login ?? "someone"} ${review.state ?? ""}`),
			),
			list("Comments", renderComments(comments ?? []), "\n\n"),
		),
	};
}

interface Issue {
	title?: string;
	state?: string;
	user?: User;
	labels?: { name?: string }[];
	assignees?: User[];
	comments?: number;
	body?: string;
}

async function fetchIssue(route: GithubRoute, signal?: AbortSignal): Promise<GithubPage> {
	const base = `repos/${route.owner}/${route.repo}/issues/${route.rest}`;
	const issue = await ghApi<Issue>(base, signal);
	const comments = await ghApiOptional<Comment[]>(`${base}/comments?per_page=${MAX_COMMENTS}`, signal);

	const title = issue.title ?? `Issue #${route.rest}`;
	const labels = (issue.labels ?? []).map(label => label.name).filter(Boolean);
	const assignees = (issue.assignees ?? []).map(user => user.login).filter(Boolean);

	return {
		title,
		content: sections(
			[
				`${route.owner}/${route.repo} #${route.rest} \u2014 ${issue.state ?? "unknown"}`,
				`opened by ${issue.user?.login ?? "someone"}`,
				labels.length > 0 ? `labels: ${labels.join(", ")}` : "",
				assignees.length > 0 ? `assigned to: ${assignees.join(", ")}` : "",
			]
				.filter(Boolean)
				.join("\n"),
			issue.body?.trim() ? `## Description\n\n${issue.body.trim()}` : null,
			list("Comments", renderComments(comments ?? []), "\n\n"),
		),
	};
}

interface Commit {
	sha?: string;
	commit?: { message?: string; author?: { name?: string; date?: string } };
	stats?: { additions?: number; deletions?: number };
	files?: FileEntry[];
}

async function fetchCommit(route: GithubRoute, signal?: AbortSignal): Promise<GithubPage> {
	const commit = await ghApi<Commit>(`repos/${route.owner}/${route.repo}/commits/${route.rest}`, signal);
	const message = commit.commit?.message ?? "";
	const [subject, ...rest] = message.split("\n");
	const title = subject || `Commit ${route.rest.slice(0, 8)}`;

	return {
		title,
		content: sections(
			[
				`${route.owner}/${route.repo} ${commit.sha?.slice(0, 8) ?? route.rest.slice(0, 8)}`,
				`${commit.commit?.author?.name ?? "someone"} on ${commit.commit?.author?.date ?? "an unknown date"}`,
				`+${commit.stats?.additions ?? 0} \u2212${commit.stats?.deletions ?? 0} across` +
					` ${commit.files?.length ?? 0} file(s)`,
			].join("\n"),
			rest.join("\n").trim() ? `## Message\n\n${rest.join("\n").trim()}` : null,
			list("Files changed", renderFiles(commit.files ?? [])),
		),
	};
}

interface Comparison {
	status?: string;
	ahead_by?: number;
	behind_by?: number;
	total_commits?: number;
	commits?: CommitEntry[];
	files?: FileEntry[];
}

async function fetchCompare(route: GithubRoute, signal?: AbortSignal): Promise<GithubPage> {
	const comparison = await ghApi<Comparison>(
		`repos/${route.owner}/${route.repo}/compare/${encodeURIComponent(route.rest)}`,
		signal,
	);
	const title = `${route.owner}/${route.repo}: ${route.rest}`;

	return {
		title,
		content: sections(
			[
				`${comparison.status ?? "compared"}: ${comparison.ahead_by ?? 0} ahead,` +
					` ${comparison.behind_by ?? 0} behind`,
				`${comparison.total_commits ?? 0} commit(s), ${comparison.files?.length ?? 0} file(s) changed`,
			].join("\n"),
			list("Commits", renderCommits(comparison.commits ?? [])),
			list("Files changed", renderFiles(comparison.files ?? [])),
		),
	};
}

interface Release {
	name?: string;
	tag_name?: string;
	published_at?: string;
	author?: User;
	prerelease?: boolean;
	body?: string;
	assets?: { name?: string; size?: number }[];
}

async function fetchRelease(route: GithubRoute, signal?: AbortSignal): Promise<GithubPage> {
	const release = await ghApi<Release>(
		`repos/${route.owner}/${route.repo}/releases/tags/${encodeURIComponent(route.rest)}`,
		signal,
	);
	const title = release.name || release.tag_name || route.rest;

	return {
		title,
		content: sections(
			[
				`${route.owner}/${route.repo} ${release.tag_name ?? route.rest}` +
					`${release.prerelease ? " (prerelease)" : ""}`,
				`published ${release.published_at ?? "at an unknown time"}` + ` by ${release.author?.login ?? "someone"}`,
			].join("\n"),
			release.body?.trim() ? `## Release notes\n\n${release.body.trim()}` : null,
			list(
				"Assets",
				(release.assets ?? []).map(asset => `- ${asset.name ?? "?"} (${asset.size ?? 0} bytes)`),
			),
		),
	};
}

interface ContentEntry {
	name?: string;
	type?: string;
	size?: number;
}

async function fetchTree(route: GithubRoute, signal?: AbortSignal): Promise<GithubPage> {
	const path = route.path ? `/${route.path}` : "";
	const entries = await ghApi<ContentEntry[]>(
		`repos/${route.owner}/${route.repo}/contents${path}?ref=${encodeURIComponent(route.rest)}`,
		signal,
	);
	const title = `${route.owner}/${route.repo}: ${route.path ?? "/"}`;

	// Directories first, which is how anyone reading a listing expects it.
	const sorted = [...(Array.isArray(entries) ? entries : [])].sort((left, right) => {
		if (left.type !== right.type) return left.type === "dir" ? -1 : 1;
		return (left.name ?? "").localeCompare(right.name ?? "");
	});

	return {
		title,
		content: sections(
			`${route.owner}/${route.repo} at ${route.rest}`,
			list(
				"Contents",
				sorted.map(entry => (entry.type === "dir" ? `- ${entry.name}/` : `- ${entry.name} (${entry.size ?? 0} bytes)`)),
			),
		),
	};
}

interface Repository {
	full_name?: string;
	description?: string;
	language?: string;
	stargazers_count?: number;
	forks_count?: number;
	open_issues_count?: number;
	topics?: string[];
	license?: { spdx_id?: string };
	default_branch?: string;
	homepage?: string;
	archived?: boolean;
	pushed_at?: string;
}

async function fetchRepo(route: GithubRoute, signal?: AbortSignal): Promise<GithubPage> {
	const base = `repos/${route.owner}/${route.repo}`;
	const repository = await ghApi<Repository>(base, signal);
	const readme = await ghApiOptional<{ content?: string }>(`${base}/readme`, signal);

	// The README arrives base64-encoded; without decoding it is unreadable.
	const readmeText = readme?.content ? Buffer.from(readme.content, "base64").toString("utf8").trim() : "";
	const title = repository.full_name ?? `${route.owner}/${route.repo}`;

	return {
		title,
		content: sections(
			[
				repository.description ?? "",
				repository.archived ? "archived" : "",
				`${repository.stargazers_count ?? 0} stars, ${repository.forks_count ?? 0} forks,` +
					` ${repository.open_issues_count ?? 0} open issues`,
				repository.language ? `primary language: ${repository.language}` : "",
				repository.license?.spdx_id ? `license: ${repository.license.spdx_id}` : "",
				repository.topics?.length ? `topics: ${repository.topics.join(", ")}` : "",
				repository.homepage ? `homepage: ${repository.homepage}` : "",
				`default branch: ${repository.default_branch ?? "?"}`,
				repository.pushed_at ? `last pushed: ${repository.pushed_at}` : "",
			]
				.filter(Boolean)
				.join("\n"),
			readmeText ? `## README\n\n${readmeText}` : null,
		),
	};
}

/**
 * Fetch a GitHub page through the API.
 *
 * Blobs are absent here on purpose: they are served from the raw host, which
 * needs no credentials, so the caller redirects rather than calling this.
 */
export async function fetchGithubPage(route: GithubRoute, signal?: AbortSignal): Promise<GithubPage> {
	switch (route.kind) {
		case "pull":
			return await fetchPull(route, signal);
		case "issue":
			return await fetchIssue(route, signal);
		case "commit":
			return await fetchCommit(route, signal);
		case "compare":
			return await fetchCompare(route, signal);
		case "release":
			return await fetchRelease(route, signal);
		case "tree":
			return await fetchTree(route, signal);
		case "repo":
			return await fetchRepo(route, signal);
		case "blob":
			throw new Error("Blobs are fetched from the raw host, not the API");
	}
}
