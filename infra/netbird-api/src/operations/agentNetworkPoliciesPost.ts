import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, Conflict } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkPoliciesPostInput {
	name: string;
	description?: string;
	enabled?: boolean;
	source_groups: ReadonlyArray<string>;
	destination_provider_ids: ReadonlyArray<string>;
	guardrail_ids?: ReadonlyArray<string>;
	limits?: {
		token_limit: { enabled: boolean; group_cap: number; user_cap: number; window_seconds: number };
		budget_limit: { enabled: boolean; group_cap_usd: number; user_cap_usd: number; window_seconds: number };
	};
}
export const AgentNetworkPoliciesPostInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	description: Schema.optional(Schema.String),
	enabled: Schema.optional(Schema.Boolean),
	source_groups: Schema.Array(Schema.String),
	destination_provider_ids: Schema.Array(Schema.String),
	guardrail_ids: Schema.optional(Schema.Array(Schema.String)),
	limits: Schema.optional(
		Schema.Struct({
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
	),
}).pipe(
	T.Http({ method: "POST", path: "/api/agent-network/policies" }),
) as unknown as Schema.Codec<AgentNetworkPoliciesPostInput>;

// Output Schema
export interface AgentNetworkPoliciesPostOutput {
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
}
export const AgentNetworkPoliciesPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<AgentNetworkPoliciesPostOutput>;

// The operation
/**
 * Create an Agent Network Policy
 *
 * Creates a new Agent Network policy binding source groups to destination providers, optionally enforced by guardrails.
 */
export const agentNetworkPoliciesPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkPoliciesPostInput,
	outputSchema: AgentNetworkPoliciesPostOutput,
	errors: [BadRequest, Forbidden, Conflict] as const,
}));
