import { webSearch } from "./web-search.ts";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export { webSearch } from "./web-search.ts";
export { getBaseUrl, searchWithSearXNG } from "./searxng.ts";
export type { RecencyFilter, SearchOptions, SearchResponse, SearchResult } from "./searxng.ts";

export default function (pi: ExtensionAPI): void {
	pi.registerTool(webSearch);
}
