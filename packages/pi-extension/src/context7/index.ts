import { context7 } from "./context7.ts";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export { context7 } from "./context7.ts";
export { buildSearchUrl, Context7Error, getApiKey, getBaseUrl, parseResponse, searchDocs } from "./client.ts";
export type {
	CodeSnippet,
	InfoSnippet,
	LibraryVersion,
	PartialReason,
	SearchOptions,
	SearchOutcome,
	SearchResponse,
	VersionReport,
	VersionStatus,
} from "./client.ts";
export { formatNotices, formatResponse, groupByLibrary } from "./format.ts";
export type { LibraryGroup } from "./format.ts";

export default function (pi: ExtensionAPI): void {
	pi.registerTool(context7);
}
