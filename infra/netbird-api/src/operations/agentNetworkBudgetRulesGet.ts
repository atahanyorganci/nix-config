import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkBudgetRulesGetInput {}
export const AgentNetworkBudgetRulesGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/agent-network/budget-rules" }),
) as unknown as Schema.Codec<AgentNetworkBudgetRulesGetInput>;

// Output Schema
export type AgentNetworkBudgetRulesGetOutput = ReadonlyArray<{
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
}>;
export const AgentNetworkBudgetRulesGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
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
	}),
) as unknown as Schema.Codec<AgentNetworkBudgetRulesGetOutput>;

// The operation
/**
 * List all Agent Network budget rules
 *
 * Returns all account-level budget rules.
 */
export const agentNetworkBudgetRulesGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkBudgetRulesGetInput,
	outputSchema: AgentNetworkBudgetRulesGetOutput,
	errors: [Forbidden] as const,
}));
