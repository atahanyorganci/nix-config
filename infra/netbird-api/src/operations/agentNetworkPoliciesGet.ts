import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkPoliciesGetInput {}
export const AgentNetworkPoliciesGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/agent-network/policies" }),
) as unknown as Schema.Codec<AgentNetworkPoliciesGetInput>;

// Output Schema
export type AgentNetworkPoliciesGetOutput = ReadonlyArray<{
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	source_groups: ReadonlyArray<string>;
	destination_provider_ids: ReadonlyArray<string>;
	guardrail_ids: ReadonlyArray<string>;
	limits: {
		token_limit: { enabled: boolean; group_cap: number; user_cap: number; window_seconds: number };
		budget_limit: { enabled: boolean; group_cap_usd: number; user_cap_usd: number; window_seconds: number };
	};
	created_at: string;
	updated_at: string;
}>;
export const AgentNetworkPoliciesGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		name: Schema.String,
		description: Schema.String,
		enabled: Schema.Boolean,
		source_groups: Schema.Array(Schema.String),
		destination_provider_ids: Schema.Array(Schema.String),
		guardrail_ids: Schema.Array(Schema.String),
		limits: Schema.Struct({
			token_limit: Schema.Struct({
				enabled: Schema.Boolean,
				group_cap: Schema.Number,
				user_cap: Schema.Number,
				window_seconds: Schema.Number,
			}),
			budget_limit: Schema.Struct({
				enabled: Schema.Boolean,
				group_cap_usd: Schema.Number,
				user_cap_usd: Schema.Number,
				window_seconds: Schema.Number,
			}),
		}),
		created_at: Schema.String,
		updated_at: Schema.String,
	}),
) as unknown as Schema.Codec<AgentNetworkPoliciesGetOutput>;

// The operation
/**
 * List all Agent Network Policies
 *
 * Returns a list of all Agent Network policies for the account.
 */
export const agentNetworkPoliciesGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkPoliciesGetInput,
	outputSchema: AgentNetworkPoliciesGetOutput,
	errors: [Forbidden] as const,
}));
