import { fetchContent } from "./fetch-content.ts";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export { fetchContent, getAllowRanges } from "./fetch-content.ts";
export { DEFAULT_MAX_BYTES, DEFAULT_TIMEOUT_MS, extractAll, extractContent } from "./extract.ts";
export type { ExtractedContent, ExtractOptions } from "./extract.ts";
export { isCobaltUrl, resolveMedia } from "./cobalt.ts";
export type { CobaltMedia } from "./cobalt.ts";
export { facts, formatBytes, joinResults, renderResult, toContentBlocks } from "./render.ts";
export type { Attachment, Fact, FetchResult } from "./render.ts";
export { isUsable, parseOpenGraph, preferMetadata, prefersMetadata, renderOpenGraph } from "./handlers/opengraph.ts";
export type { OpenGraph } from "./handlers/opengraph.ts";
export { BlockedUrlError, fetchRemoteUrl, validateRemoteUrl } from "./ssrf.ts";
export type { FetchRemoteOptions, ValidateOptions } from "./ssrf.ts";

export default function (pi: ExtensionAPI): void {
	pi.registerTool(fetchContent);
}
