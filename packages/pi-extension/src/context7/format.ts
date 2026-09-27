import type { CodeSnippet, InfoSnippet, LibraryVersion, PartialReason, SearchResponse } from "./client.ts";

/**
 * Renders a v3 search response as markdown for the model.
 *
 * The layout follows the server's own `txt` format (a `Library:` line, then
 * `###` title, `Source:` and a fenced block per snippet) so results read the
 * same as Context7's MCP output. What it adds is everything `txt` drops or
 * hides in headers: which version each library actually served, and whether
 * the search only partially succeeded.
 */

export interface LibraryGroup {
	libraryId: string;
	code: CodeSnippet[];
	info: InfoSnippet[];
}

/**
 * JSON splits code and prose into separate ranked arrays, so the interleaved
 * global order is lost either way. Grouping by library, in order of first
 * appearance, at least keeps the best library first and makes each ID the
 * header of the evidence it produced.
 */
export function groupByLibrary(response: SearchResponse): LibraryGroup[] {
	const groups = new Map<string, LibraryGroup>();
	const groupFor = (libraryId: string): LibraryGroup => {
		let group = groups.get(libraryId);
		if (!group) {
			group = { libraryId, code: [], info: [] };
			groups.set(libraryId, group);
		}
		return group;
	};
	for (const snippet of response.codeSnippets) groupFor(snippet.libraryId).code.push(snippet);
	for (const snippet of response.infoSnippets) groupFor(snippet.libraryId).info.push(snippet);
	return [...groups.values()];
}

/** A fence longer than any backtick run inside, so embedded fences cannot close it. */
function fence(code: string, language: string): string {
	const longest = Math.max(0, ...(code.match(/`+/g) ?? []).map(run => run.length));
	const ticks = "`".repeat(Math.max(3, longest + 1));
	return `${ticks}${language}\n${code.replace(/\n+$/, "")}\n${ticks}`;
}

function formatCode(snippet: CodeSnippet): string {
	const parts = [`### ${snippet.codeTitle || snippet.pageTitle || "Untitled snippet"}`];
	if (snippet.codeId) parts.push(`Source: ${snippet.codeId}`);
	if (snippet.codeDescription) parts.push(snippet.codeDescription);
	for (const example of snippet.codeList) {
		parts.push(fence(example.code, example.language || snippet.codeLanguage));
	}
	return parts.join("\n\n");
}

function formatInfo(snippet: InfoSnippet): string {
	const parts: string[] = [];
	if (snippet.breadcrumb) parts.push(`### ${snippet.breadcrumb}`);
	if (snippet.pageId) parts.push(`Source: ${snippet.pageId}`);
	parts.push(snippet.content.trim());
	return parts.join("\n\n");
}

function describeVersion(entry: LibraryVersion): string {
	switch (entry.status) {
		case "verified":
			return `${entry.libraryId}: serving ${entry.served ?? entry.requested} (requested ${entry.requested}, verified).`;
		case "prerelease":
			return (
				`${entry.libraryId}: only a prerelease matched requested version ${entry.requested}; ` +
				`serving ${entry.served ?? "an unknown tag"}. Check for behaviour that changed before the stable release.`
			);
		case "unverified":
			return (
				`${entry.libraryId}: no documentation indexed for version ${entry.requested}; ` +
				"serving current documentation, which may not match that version."
			);
	}
}

/** Warnings the model must see before trusting the snippets below them. */
export function formatNotices(response: SearchResponse, partialReason?: PartialReason): string[] {
	const notices: string[] = [];
	if (partialReason === "partialSearchFailure") {
		notices.push("Note: Context7 reported a partial search failure; results may be incomplete.");
	}
	const version = response.version;
	if (version && version.libraries.length > 0) {
		const lines = version.libraries.map(entry => `- ${describeVersion(entry)}`);
		const heading = version.status === "verified" ? "Version:" : "Warning — version mismatch:";
		notices.push([heading, ...lines].join("\n"));
	} else if (partialReason === "versionUnverified" || partialReason === "versionPrerelease") {
		// The header without a JSON report should not happen, but the header
		// alone is still reason enough not to present the docs as versioned.
		notices.push(
			partialReason === "versionPrerelease"
				? "Warning: only a prerelease matched the requested version."
				: "Warning: the requested version is not indexed; showing current documentation.",
		);
	}
	const global = response.rules?.global ?? [];
	if (global.length > 0) {
		notices.push(["Guidelines:", ...global.map(rule => `- ${rule}`)].join("\n"));
	}
	return notices;
}

function formatLibraryRules(response: SearchResponse, libraryId: string): string | undefined {
	const rules = response.rules?.libraries?.find(entry => entry.libraryId === libraryId);
	if (!rules) return undefined;
	const lines = [...rules.libraryOwn, ...rules.libraryTeam].map(rule => `- ${rule}`);
	return lines.length > 0 ? ["Library guidelines:", ...lines].join("\n") : undefined;
}

export function formatResponse(response: SearchResponse, partialReason?: PartialReason): string {
	const groups = groupByLibrary(response);
	const sections: string[] = [];

	const notices = formatNotices(response, partialReason);
	if (notices.length > 0) sections.push(notices.join("\n\n"));

	for (const group of groups) {
		const blocks = [`Library: ${group.libraryId || "(unknown)"}`];
		const rules = formatLibraryRules(response, group.libraryId);
		if (rules) blocks.push(rules);
		blocks.push(...group.code.map(formatCode), ...group.info.map(formatInfo));
		sections.push(blocks.join("\n\n"));
	}

	// Fuzzy hints can pull in a namesake (asking for `nix` also returned the
	// Rust crate `nix-rust/nix`). The IDs above are exactly what narrows the
	// next call, so say so where the model will read it.
	if (groups.length > 1) {
		sections.push(
			`Results came from ${groups.length} libraries. If some are unrelated, ` +
				"call again with the exact library ID(s) above in `libraries`.",
		);
	}

	return sections.join("\n\n---\n\n");
}
