import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, Conflict } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkGuardrailsPostInput {
	name: string;
	description?: string;
	checks: {
		model_allowlist: { enabled: boolean; models: ReadonlyArray<string> };
		prompt_capture: { enabled: boolean; redact_pii: boolean };
	};
}
export const AgentNetworkGuardrailsPostInput = /*@__PURE__*/ Schema.Struct({
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
	T.Http({ method: "POST", path: "/api/agent-network/guardrails" }),
) as unknown as Schema.Codec<AgentNetworkGuardrailsPostInput>;

// Output Schema
export interface AgentNetworkGuardrailsPostOutput {
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
export const AgentNetworkGuardrailsPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<AgentNetworkGuardrailsPostOutput>;

// The operation
/**
 * Create an Agent Network Guardrail
 *
 * Creates a new Agent Network guardrail that can be attached to one or more policies.
 */
export const agentNetworkGuardrailsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkGuardrailsPostInput,
	outputSchema: AgentNetworkGuardrailsPostOutput,
	errors: [BadRequest, Forbidden, Conflict] as const,
}));
