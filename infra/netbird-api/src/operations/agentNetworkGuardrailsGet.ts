import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkGuardrailsGetInput {}
export const AgentNetworkGuardrailsGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/agent-network/guardrails" }),
) as unknown as Schema.Codec<AgentNetworkGuardrailsGetInput>;

// Output Schema
export type AgentNetworkGuardrailsGetOutput = ReadonlyArray<{
	id: string;
	name: string;
	description: string;
	checks: {
		model_allowlist: { enabled: boolean; models: ReadonlyArray<string> };
		prompt_capture: { enabled: boolean; redact_pii: boolean };
	};
	created_at: string;
	updated_at: string;
}>;
export const AgentNetworkGuardrailsGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
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
	}),
) as unknown as Schema.Codec<AgentNetworkGuardrailsGetOutput>;

// The operation
/**
 * List all Agent Network Guardrails
 *
 * Returns a list of all Agent Network guardrails for the account.
 */
export const agentNetworkGuardrailsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkGuardrailsGetInput,
	outputSchema: AgentNetworkGuardrailsGetOutput,
	errors: [Forbidden] as const,
}));
