import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkPoliciesPolicyIdDeleteInput {
	policyId: string;
}
export const AgentNetworkPoliciesPolicyIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	policyId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/agent-network/policies/{policyId}" }),
) as unknown as Schema.Codec<AgentNetworkPoliciesPolicyIdDeleteInput>;

// Output Schema
export type AgentNetworkPoliciesPolicyIdDeleteOutput = void;
export const AgentNetworkPoliciesPolicyIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<AgentNetworkPoliciesPolicyIdDeleteOutput>;

// The operation
/**
 * Delete an Agent Network Policy
 *
 * Delete an existing Agent Network policy.
 *
 * @param policyId - The unique identifier of an Agent Network policy
 */
export const agentNetworkPoliciesPolicyIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkPoliciesPolicyIdDeleteInput,
	outputSchema: AgentNetworkPoliciesPolicyIdDeleteOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
