import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkSettingsGetInput {}
export const AgentNetworkSettingsGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/agent-network/settings" }),
) as unknown as Schema.Codec<AgentNetworkSettingsGetInput>;

// Output Schema
export interface AgentNetworkSettingsGetOutput {
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
export const AgentNetworkSettingsGetOutput = /*@__PURE__*/ Schema.Struct({
	cluster: Schema.String,
	subdomain: Schema.String,
	endpoint: Schema.String,
	enable_log_collection: Schema.Boolean,
	enable_prompt_collection: Schema.Boolean,
	redact_pii: Schema.Boolean,
	access_log_retention_days: Schema.optional(Schema.Number),
	created_at: Schema.String,
	updated_at: Schema.String,
}) as unknown as Schema.Codec<AgentNetworkSettingsGetOutput>;

// The operation
/**
 * Retrieve Agent Network settings
 *
 * Returns the per-account Agent Network gateway settings (cluster, subdomain, endpoint). Returns 404 when no provider has been created yet — settings are lazily bootstrapped on first provider create.
 */
export const agentNetworkSettingsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkSettingsGetInput,
	outputSchema: AgentNetworkSettingsGetOutput,
	errors: [Forbidden, NotFound] as const,
}));
