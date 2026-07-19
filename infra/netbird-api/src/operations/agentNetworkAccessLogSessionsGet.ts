import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkAccessLogSessionsGetInput {
	page?: number;
	page_size?: number;
	sort_by?:
		| "timestamp"
		| "started_at"
		| "cost_usd"
		| "total_tokens"
		| "duration"
		| "request_count"
		| "status_code"
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
export const AgentNetworkAccessLogSessionsGetInput = /*@__PURE__*/ Schema.Struct({
	page: Schema.optional(Schema.Number),
	page_size: Schema.optional(Schema.Number),
	sort_by: Schema.optional(
		Schema.Literals([
			"timestamp",
			"started_at",
			"cost_usd",
			"total_tokens",
			"duration",
			"request_count",
			"status_code",
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
	T.Http({ method: "GET", path: "/api/agent-network/access-log-sessions" }),
) as unknown as Schema.Codec<AgentNetworkAccessLogSessionsGetInput>;

// Output Schema
export interface AgentNetworkAccessLogSessionsGetOutput {
	data: ReadonlyArray<{
		session_id?: string;
		user_id?: string;
		group_ids?: ReadonlyArray<string>;
		started_at: string;
		ended_at: string;
		request_count: number;
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
		cost_usd: number;
		providers?: ReadonlyArray<string>;
		models?: ReadonlyArray<string>;
		decision: string;
		entries: ReadonlyArray<{
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
	}>;
	page: number;
	page_size: number;
	total_records: number;
	total_pages: number;
}
export const AgentNetworkAccessLogSessionsGetOutput = /*@__PURE__*/ Schema.Struct({
	data: Schema.Array(
		Schema.Struct({
			session_id: Schema.optional(Schema.String),
			user_id: Schema.optional(Schema.String),
			group_ids: Schema.optional(Schema.Array(Schema.String)),
			started_at: Schema.String,
			ended_at: Schema.String,
			request_count: Schema.Number,
			input_tokens: Schema.Number,
			output_tokens: Schema.Number,
			total_tokens: Schema.Number,
			cost_usd: Schema.Number,
			providers: Schema.optional(Schema.Array(Schema.String)),
			models: Schema.optional(Schema.Array(Schema.String)),
			decision: Schema.String,
			entries: Schema.Array(
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
		}),
	),
	page: Schema.Number,
	page_size: Schema.Number,
	total_records: Schema.Number,
	total_pages: Schema.Number,
}) as unknown as Schema.Codec<AgentNetworkAccessLogSessionsGetOutput>;

// The operation
/**
 * List Agent Network access logs grouped by session
 *
 * Returns a paginated, server-side-filtered list of agent-network (LLM) access logs grouped by session. The page unit is a session (total_records counts sessions); each session carries an aggregate summary and its ordered entries. Requests the client sent no session id for each form their own singleton group. Accepts the same filters as the flat access-logs endpoint. Available only when the account has log collection enabled.
 *
 * @param page - Page number for pagination (1-indexed).
 * @param page_size - Number of sessions per page (max 100).
 * @param sort_by - Session-level field to sort by. "timestamp" is the session's last activity, "started_at" its first.
 * @param sort_order - Sort order (ascending or descending).
 * @param search - General search across log ID, host, path, model, and user email/name.
 * @param user_id - Filter by authenticated user ID.
 * @param session_id - Filter to a single conversation / coding session id.
 * @param group_id - Filter by authorising group id. Repeat for multiple (matches any).
 * @param provider_id - Filter by resolved provider id. Repeat for multiple (matches any).
 * @param model - Filter by model. Repeat for multiple (matches any).
 * @param decision - Filter by policy decision (e.g. allow, deny).
 * @param path - Filter by request path prefix (matches entries whose path starts with this value).
 * @param start_date - Filter by timestamp >= start_date (RFC3339 format).
 * @param end_date - Filter by timestamp <= end_date (RFC3339 format).
 */
export const agentNetworkAccessLogSessionsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkAccessLogSessionsGetInput,
	outputSchema: AgentNetworkAccessLogSessionsGetOutput,
	errors: [Forbidden] as const,
}));
