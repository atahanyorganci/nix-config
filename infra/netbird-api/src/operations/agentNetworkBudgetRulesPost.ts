import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkBudgetRulesPostInput {
	name: string;
	enabled?: boolean;
	target_groups?: ReadonlyArray<string>;
	target_users?: ReadonlyArray<string>;
	limits: {
		token_limit: { enabled: boolean; group_cap: number; user_cap: number; window_seconds: number };
		budget_limit: { enabled: boolean; group_cap_usd: number; user_cap_usd: number; window_seconds: number };
	};
}
export const AgentNetworkBudgetRulesPostInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	enabled: Schema.optional(Schema.Boolean),
	target_groups: Schema.optional(Schema.Array(Schema.String)),
	target_users: Schema.optional(Schema.Array(Schema.String)),
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
}).pipe(
	T.Http({ method: "POST", path: "/api/agent-network/budget-rules" }),
) as unknown as Schema.Codec<AgentNetworkBudgetRulesPostInput>;

// Output Schema
export interface AgentNetworkBudgetRulesPostOutput {
	id: string;
	name: string;
	enabled: boolean;
	target_groups: ReadonlyArray<string>;
	target_users: ReadonlyArray<string>;
	limits: {
		token_limit: { enabled: boolean; group_cap: number; user_cap: number; window_seconds: number };
		budget_limit: { enabled: boolean; group_cap_usd: number; user_cap_usd: number; window_seconds: number };
	};
	created_at: string;
	updated_at: string;
}
export const AgentNetworkBudgetRulesPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	enabled: Schema.Boolean,
	target_groups: Schema.Array(Schema.String),
	target_users: Schema.Array(Schema.String),
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
}) as unknown as Schema.Codec<AgentNetworkBudgetRulesPostOutput>;

// The operation
/**
 * Create an Agent Network budget rule
 *
 * Creates a new account-level budget rule.
 */
export const agentNetworkBudgetRulesPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkBudgetRulesPostInput,
	outputSchema: AgentNetworkBudgetRulesPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
