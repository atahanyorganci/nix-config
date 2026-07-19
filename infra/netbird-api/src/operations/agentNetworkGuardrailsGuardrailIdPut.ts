import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound, Conflict } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkGuardrailsGuardrailIdPutInput {
	guardrailId: string;
	name: string;
	description?: string;
	checks: {
		model_allowlist: { enabled: boolean; models: ReadonlyArray<string> };
		prompt_capture: { enabled: boolean; redact_pii: boolean };
	};
}
export const AgentNetworkGuardrailsGuardrailIdPutInput = /*@__PURE__*/ Schema.Struct({
	guardrailId: Schema.String.pipe(T.PathParam()),
	name: Schema.String,
	description: Schema.optional(Schema.String),
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
}).pipe(
	T.Http({ method: "PUT", path: "/api/agent-network/guardrails/{guardrailId}" }),
) as unknown as Schema.Codec<AgentNetworkGuardrailsGuardrailIdPutInput>;

// Output Schema
export interface AgentNetworkGuardrailsGuardrailIdPutOutput {
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
export const AgentNetworkGuardrailsGuardrailIdPutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<AgentNetworkGuardrailsGuardrailIdPutOutput>;

// The operation
/**
 * Update an Agent Network Guardrail
 *
 * Update an existing Agent Network guardrail.
 *
 * @param guardrailId - The unique identifier of an Agent Network guardrail
 */
export const agentNetworkGuardrailsGuardrailIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkGuardrailsGuardrailIdPutInput,
	outputSchema: AgentNetworkGuardrailsGuardrailIdPutOutput,
	errors: [BadRequest, Forbidden, NotFound, Conflict] as const,
}));
