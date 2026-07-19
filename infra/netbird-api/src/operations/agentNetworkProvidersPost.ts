import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, Conflict } from "../errors.ts";
import { SensitiveString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface AgentNetworkProvidersPostInput {
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
export const AgentNetworkProvidersPostInput = /*@__PURE__*/ Schema.Struct({
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
	T.Http({ method: "POST", path: "/api/agent-network/providers" }),
) as unknown as Schema.Codec<AgentNetworkProvidersPostInput>;

// Output Schema
export interface AgentNetworkProvidersPostOutput {
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
export const AgentNetworkProvidersPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<AgentNetworkProvidersPostOutput>;

// The operation
/**
 * Create an Agent Network Provider
 *
 * Connects a new Agent Network AI provider for the account.
 */
export const agentNetworkProvidersPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkProvidersPostInput,
	outputSchema: AgentNetworkProvidersPostOutput,
	errors: [BadRequest, Forbidden, Conflict] as const,
}));
