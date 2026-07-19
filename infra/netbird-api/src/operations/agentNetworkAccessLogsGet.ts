import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkAccessLogsGetInput {
	page?: number;
	page_size?: number;
	sort_by?:
		| "timestamp"
		| "model"
		| "provider"
		| "status_code"
		| "duration"
		| "cost_usd"
		| "total_tokens"
		| "user_id"
		| "decision";
	sort_order?: "asc" | "desc";
	search?: string;
	user_id?: string;
	session_id?: string;
	group_id?: ReadonlyArray<string>;
	provider_id?: ReadonlyArray<string>;
	model?: ReadonlyArray<string>;
	decision?: string;
	path?: string;
	start_date?: string;
	end_date?: string;
}
export const AgentNetworkAccessLogsGetInput = /*@__PURE__*/ Schema.Struct({
	page: Schema.optional(Schema.Number),
	page_size: Schema.optional(Schema.Number),
	sort_by: Schema.optional(
		Schema.Literals([
			"timestamp",
			"model",
			"provider",
			"status_code",
			"duration",
			"cost_usd",
			"total_tokens",
			"user_id",
			"decision",
		]),
	),
	sort_order: Schema.optional(Schema.Literals(["asc", "desc"])),
	search: Schema.optional(Schema.String),
	user_id: Schema.optional(Schema.String),
	session_id: Schema.optional(Schema.String),
	group_id: Schema.optional(Schema.Array(Schema.String)),
	provider_id: Schema.optional(Schema.Array(Schema.String)),
	model: Schema.optional(Schema.Array(Schema.String)),
	decision: Schema.optional(Schema.String),
	path: Schema.optional(Schema.String),
	start_date: Schema.optional(Schema.String),
	end_date: Schema.optional(Schema.String),
}).pipe(
	T.Http({ method: "GET", path: "/api/agent-network/access-logs" }),
) as unknown as Schema.Codec<AgentNetworkAccessLogsGetInput>;

// Output Schema
export interface AgentNetworkAccessLogsGetOutput {
	data: ReadonlyArray<{
		id: string;
		service_id: string;
		timestamp: string;
		status_code: number;
		duration_ms: number;
		user_id?: string;
		source_ip?: string;
		method?: string;
		host?: string;
		path?: string;
		provider?: string;
		model?: string;
		session_id?: string;
		resolved_provider_id?: string;
		selected_policy_id?: string;
		decision?: string;
		deny_reason?: string;
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
		cost_usd: number;
		stream?: boolean;
		group_ids?: ReadonlyArray<string>;
		request_prompt?: string;
		response_completion?: string;
	}>;
	page: number;
	page_size: number;
	total_records: number;
	total_pages: number;
}
export const AgentNetworkAccessLogsGetOutput = /*@__PURE__*/ Schema.Struct({
	data: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			service_id: Schema.String,
			timestamp: Schema.String,
			status_code: Schema.Number,
			duration_ms: Schema.Number,
			user_id: Schema.optional(Schema.String),
			source_ip: Schema.optional(Schema.String),
			method: Schema.optional(Schema.String),
			host: Schema.optional(Schema.String),
			path: Schema.optional(Schema.String),
			provider: Schema.optional(Schema.String),
			model: Schema.optional(Schema.String),
			session_id: Schema.optional(Schema.String),
			resolved_provider_id: Schema.optional(Schema.String),
			selected_policy_id: Schema.optional(Schema.String),
			decision: Schema.optional(Schema.String),
			deny_reason: Schema.optional(Schema.String),
			input_tokens: Schema.Number,
			output_tokens: Schema.Number,
			total_tokens: Schema.Number,
			cost_usd: Schema.Number,
			stream: Schema.optional(Schema.Boolean),
			group_ids: Schema.optional(Schema.Array(Schema.String)),
			request_prompt: Schema.optional(Schema.String),
			response_completion: Schema.optional(Schema.String),
		}),
	),
	page: Schema.Number,
	page_size: Schema.Number,
	total_records: Schema.Number,
	total_pages: Schema.Number,
}) as unknown as Schema.Codec<AgentNetworkAccessLogsGetOutput>;

// The operation
/**
 * List Agent Network access logs
 *
 * Returns a paginated, server-side-filtered list of agent-network (LLM) access log entries. Available only when the account has log collection enabled; otherwise entries are not retained.
 *
 * @param page - Page number for pagination (1-indexed).
 * @param page_size - Number of items per page (max 100).
 * @param sort_by - Field to sort by.
 * @param sort_order - Sort order (ascending or descending).
 * @param search - General search across log ID, host, path, model, and user email/name.
 * @param user_id - Filter by authenticated user ID.
 * @param session_id - Filter to a single conversation / coding session id (groups all requests of one session).
 * @param group_id - Filter by authorising group id. Repeat for multiple (matches any).
 * @param provider_id - Filter by resolved provider id. Repeat for multiple (matches any).
 * @param model - Filter by model. Repeat for multiple (matches any).
 * @param decision - Filter by policy decision (e.g. allow, deny).
 * @param path - Filter by request path prefix (matches entries whose path starts with this value).
 * @param start_date - Filter by timestamp >= start_date (RFC3339 format).
 * @param end_date - Filter by timestamp <= end_date (RFC3339 format).
 */
export const agentNetworkAccessLogsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkAccessLogsGetInput,
	outputSchema: AgentNetworkAccessLogsGetOutput,
	errors: [Forbidden] as const,
}));
