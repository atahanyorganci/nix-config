import type { ImageContent, TextContent } from "@earendil-works/pi-ai";

/**
 * One shape for every provider's output, and one renderer for it.
 *
 * Before this, each provider rendered itself: a page got a heading and a
 * `Source:` line, a direct image got `Image from` with no heading, and cobalt
 * media got `Media from` with a flat key/value list. Three vocabularies for
 * the same three ideas -- where this came from, what it is, what was saved --
 * which left the model guessing whether `Saved to:` on one result meant the
 * same thing as `Saved to:` on another.
 *
 * Providers now describe their result and say nothing about its presentation.
 */

/** A labelled scalar shown beneath the source line, in declaration order. */
export interface Fact {
	readonly label: string;
	readonly value: string;
}

/** A file written to disk that cannot travel in a tool result. */
export interface Attachment {
	readonly path: string;
	/** What the file is, in the model's terms: "video", "audio", "text". */
	readonly kind: string;
	readonly bytes?: number;
	readonly seconds?: number;
	/** Set when the file is a fragment rather than the whole thing. */
	readonly incomplete?: boolean;
}

export interface FetchResult {
	readonly url: string;
	readonly title: string;
	readonly content: string;
	/**
	 * A fatal reason when `content` is empty, a warning otherwise.
	 *
	 * The distinction is the renderer's to make, not the provider's: a thin
	 * extraction is still worth returning alongside the doubt.
	 */
	readonly error: string | null;
	readonly facts?: readonly Fact[];
	/** Blocks passed to the model directly, before the text. */
	readonly images?: readonly ImageContent[];
	readonly attachments?: readonly Attachment[];
}

/** Human-readable size, so the model can judge whether a file is worth opening. */
export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Drop empty and duplicate facts, so a provider can build a list unconditionally. */
export function facts(...entries: (Fact | null | undefined | false)[]): Fact[] {
	const seen = new Set<string>();
	const kept: Fact[] = [];
	for (const entry of entries) {
		if (!entry || !entry.value.trim()) continue;
		if (seen.has(entry.label)) continue;
		seen.add(entry.label);
		kept.push({ label: entry.label, value: entry.value.trim() });
	}
	return kept;
}

/** One attachment line: what it is, how big, and where it landed. */
function renderAttachment(attachment: Attachment): string {
	const detail = [
		attachment.bytes === undefined ? "" : formatBytes(attachment.bytes),
		attachment.seconds === undefined ? "" : `${Math.round(attachment.seconds)}s`,
	]
		.filter(Boolean)
		.join(", ");

	const suffix = attachment.incomplete ? " — incomplete" : "";
	return `- ${attachment.kind}${detail ? ` (${detail})` : ""}: ${attachment.path}${suffix}`;
}

/**
 * Render one result as markdown.
 *
 * The heading comes from here rather than from the provider, which is what
 * stops a provider that builds its own `# title` from emitting it twice.
 */
export function renderResult(result: FetchResult): string {
	const heading = `# ${result.title || result.url}`;
	const lines = [`Source: ${result.url}`, ...(result.facts ?? []).map(fact => `${fact.label}: ${fact.value}`)];

	const sections = [heading, lines.join("\n")];

	// An error means nothing came back at all, which for a video is not the
	// same as having no text: the attachment is the result, and a media fetch
	// deliberately carries no content. Where something did arrive, a reason is
	// a caveat attached to it -- a truncated video is still a video.
	const hasMedia = (result.images?.length ?? 0) > 0 || (result.attachments?.length ?? 0) > 0;
	const body = result.content.trim();

	if (!body && !hasMedia) sections.push(`Error: ${result.error ?? "No content extracted"}`);
	else if (result.error) sections.push(`Note: ${result.error}`);
	if (body) sections.push(body);

	const attachments = result.attachments ?? [];
	if (attachments.length > 0) {
		sections.push(
			`## Attachments\n\n${attachments.map(renderAttachment).join("\n")}\n\n` +
				"These files were saved rather than returned; read or play them from the paths above.",
		);
	}

	return sections.join("\n\n");
}

/** Turn one result into content blocks, images first so text reads as a caption. */
export function toContentBlocks(result: FetchResult): (TextContent | ImageContent)[] {
	return [...(result.images ?? []), { type: "text", text: renderResult(result) }];
}

/** Join several results into one block stream, separated by a rule. */
export function joinResults(results: readonly FetchResult[]): (TextContent | ImageContent)[] {
	return results.flatMap<TextContent | ImageContent>((result, index) =>
		index === 0 ? toContentBlocks(result) : [{ type: "text", text: "\n\n---\n\n" }, ...toContentBlocks(result)],
	);
}
