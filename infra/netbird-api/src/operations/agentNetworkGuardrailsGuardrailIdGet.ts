import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkGuardrailsGuardrailIdGetInput {
	guardrailId: string;
}
export const AgentNetworkGuardrailsGuardrailIdGetInput = /*@__PURE__*/ Schema.Struct({
	guardrailId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/agent-network/guardrails/{guardrailId}" }),
) as unknown as Schema.Codec<AgentNetworkGuardrailsGuardrailIdGetInput>;

// Output Schema
export interface AgentNetworkGuardrailsGuardrailIdGetOutput {
	id: string;
	name: string;
	description: string;
	checks: {
		model_allowlist: { enabled: boolean; models: ReadonlyArray<string> };
		prompt_capture: { enabled: boolean; redact_pii: boolean };
	};
	created_at: string;
	updated_at: string;
}
export const AgentNetworkGuardrailsGuardrailIdGetOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	description: Schema.String,
	checks: Schema.Struct({
		model_allowlist: Schema.Struct({
			enabled: Schema.Boolean,
			models: Schema.Array(Schema.String),
		}),
		prompt_capture: Schema.Struct({
			enabled: Schema.Boolean,
			redact_pii: Schema.Boolean,
		}),
	}),
	created_at: Schema.String,
	updated_at: Schema.String,
}) as unknown as Schema.Codec<AgentNetworkGuardrailsGuardrailIdGetOutput>;

// The operation
/**
 * Retrieve an Agent Network Guardrail
 *
 * Get information about a specific Agent Network guardrail.
 *
 * @param guardrailId - The unique identifier of an Agent Network guardrail
 */
export const agentNetworkGuardrailsGuardrailIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkGuardrailsGuardrailIdGetInput,
	outputSchema: AgentNetworkGuardrailsGuardrailIdGetOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
