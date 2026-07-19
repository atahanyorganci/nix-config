import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkSettingsPutInput {
	enable_log_collection: boolean;
	enable_prompt_collection: boolean;
	redact_pii: boolean;
	access_log_retention_days?: number;
}
export const AgentNetworkSettingsPutInput = /*@__PURE__*/ Schema.Struct({
	enable_log_collection: Schema.Boolean,
	enable_prompt_collection: Schema.Boolean,
	redact_pii: Schema.Boolean,
	access_log_retention_days: Schema.optional(Schema.Number),
}).pipe(
	T.Http({ method: "PUT", path: "/api/agent-network/settings" }),
) as unknown as Schema.Codec<AgentNetworkSettingsPutInput>;

// Output Schema
export interface AgentNetworkSettingsPutOutput {
	cluster: string;
	subdomain: string;
	endpoint: string;
	enable_log_collection: boolean;
	enable_prompt_collection: boolean;
	redact_pii: boolean;
	access_log_retention_days?: number;
	created_at: string;
	updated_at: string;
}
export const AgentNetworkSettingsPutOutput = /*@__PURE__*/ Schema.Struct({
	cluster: Schema.String,
	subdomain: Schema.String,
	endpoint: Schema.String,
	enable_log_collection: Schema.Boolean,
	enable_prompt_collection: Schema.Boolean,
	redact_pii: Schema.Boolean,
	access_log_retention_days: Schema.optional(Schema.Number),
	created_at: Schema.String,
	updated_at: Schema.String,
}) as unknown as Schema.Codec<AgentNetworkSettingsPutOutput>;

// The operation
/**
 * Update Agent Network settings
 *
 * Updates the mutable account-level Agent Network settings (collection toggles). Cluster and subdomain are immutable and ignored if sent. Returns 404 when settings have not been bootstrapped (no provider created yet).
 */
export const agentNetworkSettingsPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkSettingsPutInput,
	outputSchema: AgentNetworkSettingsPutOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
