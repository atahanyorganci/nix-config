import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkUsageOverviewGetInput {
	granularity?: "day" | "week" | "month";
	start_date?: string;
	end_date?: string;
	user_id?: string;
	session_id?: string;
	group_id?: ReadonlyArray<string>;
	provider_id?: ReadonlyArray<string>;
	model?: ReadonlyArray<string>;
}
export const AgentNetworkUsageOverviewGetInput = /*@__PURE__*/ Schema.Struct({
	granularity: Schema.optional(Schema.Literals(["day", "week", "month"])),
	start_date: Schema.optional(Schema.String),
	end_date: Schema.optional(Schema.String),
	user_id: Schema.optional(Schema.String),
	session_id: Schema.optional(Schema.String),
	group_id: Schema.optional(Schema.Array(Schema.String)),
	provider_id: Schema.optional(Schema.Array(Schema.String)),
	model: Schema.optional(Schema.Array(Schema.String)),
}).pipe(
	T.Http({ method: "GET", path: "/api/agent-network/usage/overview" }),
) as unknown as Schema.Codec<AgentNetworkUsageOverviewGetInput>;

// Output Schema
export type AgentNetworkUsageOverviewGetOutput = ReadonlyArray<{
	period_start: string;
	input_tokens: number;
	output_tokens: number;
	total_tokens: number;
	cost_usd: number;
}>;
export const AgentNetworkUsageOverviewGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		period_start: Schema.String,
		input_tokens: Schema.Number,
		output_tokens: Schema.Number,
		total_tokens: Schema.Number,
		cost_usd: Schema.Number,
	}),
) as unknown as Schema.Codec<AgentNetworkUsageOverviewGetOutput>;

// The operation
/**
 * Agent Network usage overview
 *
 * Returns agent-network token and cost usage aggregated into time buckets, server-side filtered. Usage is always collected (independent of log collection).
 *
 * @param granularity - Time bucket width. Defaults to day.
 * @param start_date - Filter by timestamp >= start_date (RFC3339 format).
 * @param end_date - Filter by timestamp <= end_date (RFC3339 format).
 * @param user_id - Filter by user ID.
 * @param session_id - Filter to a single conversation / coding session id.
 * @param group_id - Filter by authorising group id. Repeat for multiple (matches any).
 * @param provider_id - Filter by resolved provider id. Repeat for multiple (matches any).
 * @param model - Filter by model. Repeat for multiple (matches any).
 */
export const agentNetworkUsageOverviewGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkUsageOverviewGetInput,
	outputSchema: AgentNetworkUsageOverviewGetOutput,
	errors: [Forbidden] as const,
}));
