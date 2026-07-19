import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkPoliciesPolicyIdGetInput {
	policyId: string;
}
export const AgentNetworkPoliciesPolicyIdGetInput = /*@__PURE__*/ Schema.Struct({
	policyId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/agent-network/policies/{policyId}" }),
) as unknown as Schema.Codec<AgentNetworkPoliciesPolicyIdGetInput>;

// Output Schema
export interface AgentNetworkPoliciesPolicyIdGetOutput {
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
export const AgentNetworkPoliciesPolicyIdGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<AgentNetworkPoliciesPolicyIdGetOutput>;

// The operation
/**
 * Retrieve an Agent Network Policy
 *
 * Get information about a specific Agent Network policy.
 *
 * @param policyId - The unique identifier of an Agent Network policy
 */
export const agentNetworkPoliciesPolicyIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkPoliciesPolicyIdGetInput,
	outputSchema: AgentNetworkPoliciesPolicyIdGetOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
