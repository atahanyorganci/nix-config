import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkProvidersProviderIdGetInput {
	providerId: string;
}
export const AgentNetworkProvidersProviderIdGetInput = /*@__PURE__*/ Schema.Struct({
	providerId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/agent-network/providers/{providerId}" }),
) as unknown as Schema.Codec<AgentNetworkProvidersProviderIdGetInput>;

// Output Schema
export interface AgentNetworkProvidersProviderIdGetOutput {
	id: string;
	provider_id: string;
	name: string;
	upstream_url: string;
	models: ReadonlyArray<{ id: string; input_per_1k: number; output_per_1k: number }>;
	extra_values?: Record<string, string>;
	identity_header_user_id?: string;
	identity_header_groups?: string;
	enabled: boolean;
	skip_tls_verification: boolean;
	created_at: string;
	updated_at: string;
}
export const AgentNetworkProvidersProviderIdGetOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	provider_id: Schema.String,
	name: Schema.String,
	upstream_url: Schema.String,
	models: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			input_per_1k: Schema.Number,
			output_per_1k: Schema.Number,
		}),
	),
	extra_values: Schema.optional(Schema.Record(Schema.String, Schema.String)),
	identity_header_user_id: Schema.optional(Schema.String),
	identity_header_groups: Schema.optional(Schema.String),
	enabled: Schema.Boolean,
	skip_tls_verification: Schema.Boolean,
	created_at: Schema.String,
	updated_at: Schema.String,
}) as unknown as Schema.Codec<AgentNetworkProvidersProviderIdGetOutput>;

// The operation
/**
 * Retrieve an Agent Network Provider
 *
 * Get information about a specific Agent Network AI provider.
 *
 * @param providerId - The unique identifier of an Agent Network provider
 */
export const agentNetworkProvidersProviderIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkProvidersProviderIdGetInput,
	outputSchema: AgentNetworkProvidersProviderIdGetOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
