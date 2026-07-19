import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound, Conflict } from "../errors.ts";
import { SensitiveString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface AgentNetworkProvidersProviderIdPutInput {
	providerId: string;
	provider_id: string;
	name: string;
	upstream_url: string;
	bootstrap_cluster?: string;
	api_key?: string | Redacted.Redacted<string>;
	models?: ReadonlyArray<{ id: string; input_per_1k: number; output_per_1k: number }>;
	extra_values?: Record<string, string>;
	identity_header_user_id?: string;
	identity_header_groups?: string;
	enabled?: boolean;
	skip_tls_verification?: boolean;
}
export const AgentNetworkProvidersProviderIdPutInput = /*@__PURE__*/ Schema.Struct({
	providerId: Schema.String.pipe(T.PathParam()),
	provider_id: Schema.String,
	name: Schema.String,
	upstream_url: Schema.String,
	bootstrap_cluster: Schema.optional(Schema.String),
	api_key: Schema.optional(SensitiveString),
	models: Schema.optional(
		Schema.Array(
			Schema.Struct({
				id: Schema.String,
				input_per_1k: Schema.Number,
				output_per_1k: Schema.Number,
			}),
		),
	),
	extra_values: Schema.optional(Schema.Record(Schema.String, Schema.String)),
	identity_header_user_id: Schema.optional(Schema.String),
	identity_header_groups: Schema.optional(Schema.String),
	enabled: Schema.optional(Schema.Boolean),
	skip_tls_verification: Schema.optional(Schema.Boolean),
}).pipe(
	T.Http({ method: "PUT", path: "/api/agent-network/providers/{providerId}" }),
) as unknown as Schema.Codec<AgentNetworkProvidersProviderIdPutInput>;

// Output Schema
export interface AgentNetworkProvidersProviderIdPutOutput {
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
export const AgentNetworkProvidersProviderIdPutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<AgentNetworkProvidersProviderIdPutOutput>;

// The operation
/**
 * Update an Agent Network Provider
 *
 * Update an existing Agent Network AI provider.
 *
 * @param providerId - The unique identifier of an Agent Network provider
 */
export const agentNetworkProvidersProviderIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkProvidersProviderIdPutInput,
	outputSchema: AgentNetworkProvidersProviderIdPutOutput,
	errors: [BadRequest, Forbidden, NotFound, Conflict] as const,
}));
