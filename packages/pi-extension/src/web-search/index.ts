import { webSearch } from "./web-search.ts";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export { webSearch } from "../web-search/web-search.ts";
export { getBaseUrl, searchWithSearXNG } from "../web-search/searxng.ts";
export type { RecencyFilter, SearchOptions, SearchResponse, SearchResult } from "../web-search/searxng.ts";

export default function (pi: ExtensionAPI): void {
	pi.registerTool(webSearch);
}
