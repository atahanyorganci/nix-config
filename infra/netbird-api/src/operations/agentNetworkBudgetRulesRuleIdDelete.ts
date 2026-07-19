import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkBudgetRulesRuleIdDeleteInput {
	ruleId: string;
}
export const AgentNetworkBudgetRulesRuleIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	ruleId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/agent-network/budget-rules/{ruleId}" }),
) as unknown as Schema.Codec<AgentNetworkBudgetRulesRuleIdDeleteInput>;

// Output Schema
export type AgentNetworkBudgetRulesRuleIdDeleteOutput = unknown;
export const AgentNetworkBudgetRulesRuleIdDeleteOutput =
	/*@__PURE__*/ Schema.Unknown as unknown as Schema.Codec<AgentNetworkBudgetRulesRuleIdDeleteOutput>;

// The operation
/**
 * Delete an Agent Network budget rule
 *
 * Deletes an account-level budget rule.
 *
 * @param ruleId - The unique identifier of a budget rule
 */
export const agentNetworkBudgetRulesRuleIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkBudgetRulesRuleIdDeleteInput,
	outputSchema: AgentNetworkBudgetRulesRuleIdDeleteOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
