import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkGuardrailsGuardrailIdDeleteInput {
	guardrailId: string;
}
export const AgentNetworkGuardrailsGuardrailIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	guardrailId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/agent-network/guardrails/{guardrailId}" }),
) as unknown as Schema.Codec<AgentNetworkGuardrailsGuardrailIdDeleteInput>;

// Output Schema
export type AgentNetworkGuardrailsGuardrailIdDeleteOutput = void;
export const AgentNetworkGuardrailsGuardrailIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<AgentNetworkGuardrailsGuardrailIdDeleteOutput>;

// The operation
/**
 * Delete an Agent Network Guardrail
 *
 * Delete an existing Agent Network guardrail.
 *
 * @param guardrailId - The unique identifier of an Agent Network guardrail
 */
export const agentNetworkGuardrailsGuardrailIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkGuardrailsGuardrailIdDeleteInput,
	outputSchema: AgentNetworkGuardrailsGuardrailIdDeleteOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
