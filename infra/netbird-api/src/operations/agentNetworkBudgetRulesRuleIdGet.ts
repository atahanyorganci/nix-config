import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkBudgetRulesRuleIdGetInput {
	ruleId: string;
}
export const AgentNetworkBudgetRulesRuleIdGetInput = /*@__PURE__*/ Schema.Struct({
	ruleId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/agent-network/budget-rules/{ruleId}" }),
) as unknown as Schema.Codec<AgentNetworkBudgetRulesRuleIdGetInput>;

// Output Schema
export interface AgentNetworkBudgetRulesRuleIdGetOutput {
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
export const AgentNetworkBudgetRulesRuleIdGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<AgentNetworkBudgetRulesRuleIdGetOutput>;

// The operation
/**
 * Retrieve an Agent Network budget rule
 *
 * Get a specific account-level budget rule.
 *
 * @param ruleId - The unique identifier of a budget rule
 */
export const agentNetworkBudgetRulesRuleIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkBudgetRulesRuleIdGetInput,
	outputSchema: AgentNetworkBudgetRulesRuleIdGetOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
