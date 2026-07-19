import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkProvidersGetInput {}
export const AgentNetworkProvidersGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/agent-network/providers" }),
) as unknown as Schema.Codec<AgentNetworkProvidersGetInput>;

// Output Schema
export type AgentNetworkProvidersGetOutput = ReadonlyArray<{
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
}>;
export const AgentNetworkProvidersGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
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
	}),
) as unknown as Schema.Codec<AgentNetworkProvidersGetOutput>;

// The operation
/**
 * List all Agent Network Providers
 *
 * Returns a list of all Agent Network AI providers configured for the account.
 */
export const agentNetworkProvidersGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkProvidersGetInput,
	outputSchema: AgentNetworkProvidersGetOutput,
	errors: [Forbidden] as const,
}));
