import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkConsumptionGetInput {}
export const AgentNetworkConsumptionGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/agent-network/consumption" }),
) as unknown as Schema.Codec<AgentNetworkConsumptionGetInput>;

// Output Schema
export type AgentNetworkConsumptionGetOutput = ReadonlyArray<{
	dimension_kind: "user" | "group";
	dimension_id: string;
	window_seconds: number;
	window_start_utc: string;
	tokens_input: number;
	tokens_output: number;
	cost_usd: number;
	updated_at?: string;
}>;
export const AgentNetworkConsumptionGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		dimension_kind: Schema.Literals(["user", "group"]),
		dimension_id: Schema.String,
		window_seconds: Schema.Number,
		window_start_utc: Schema.String,
		tokens_input: Schema.Number,
		tokens_output: Schema.Number,
		cost_usd: Schema.Number,
		updated_at: Schema.optional(Schema.String),
	}),
) as unknown as Schema.Codec<AgentNetworkConsumptionGetOutput>;

// The operation
/**
 * List Agent Network consumption counters
 *
 * Returns every per-(dimension, window) consumption counter recorded for the account, ordered window-newest-first. Empty list when nothing has been consumed yet.
 */
export const agentNetworkConsumptionGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkConsumptionGetInput,
	outputSchema: AgentNetworkConsumptionGetOutput,
	errors: [Forbidden] as const,
}));
