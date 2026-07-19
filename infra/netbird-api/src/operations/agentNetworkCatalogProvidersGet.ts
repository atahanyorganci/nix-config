import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AgentNetworkCatalogProvidersGetInput {}
export const AgentNetworkCatalogProvidersGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/agent-network/catalog/providers" }),
) as unknown as Schema.Codec<AgentNetworkCatalogProvidersGetInput>;

// Output Schema
export type AgentNetworkCatalogProvidersGetOutput = ReadonlyArray<{
	id: string;
	name: string;
	description: string;
	default_host: string;
	auth_header_template: string;
	default_content_type: string;
	brand_color: string;
	kind: "provider" | "gateway" | "custom";
	extra_headers?: ReadonlyArray<{ name: string }>;
	identity_injection?: {
		header_pair?: { customizable: boolean; end_user_id_header: string; tags_header: string };
		json_metadata?: { customizable: boolean; header: string; user_key: string; groups_key: string };
	};
	models: ReadonlyArray<{
		id: string;
		label: string;
		input_per_1k: number;
		output_per_1k: number;
		context_window: number;
	}>;
}>;
export const AgentNetworkCatalogProvidersGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		name: Schema.String,
		description: Schema.String,
		default_host: Schema.String,
		auth_header_template: Schema.String,
		default_content_type: Schema.String,
		brand_color: Schema.String,
		kind: Schema.Literals(["provider", "gateway", "custom"]),
		extra_headers: Schema.optional(
			Schema.Array(
				Schema.Struct({
					name: Schema.String,
				}),
			),
		),
		identity_injection: Schema.optional(
			Schema.Struct({
				header_pair: Schema.optional(
					Schema.Struct({
						customizable: Schema.Boolean,
						end_user_id_header: Schema.String,
						tags_header: Schema.String,
					}),
				),
				json_metadata: Schema.optional(
					Schema.Struct({
						customizable: Schema.Boolean,
						header: Schema.String,
						user_key: Schema.String,
						groups_key: Schema.String,
					}),
				),
			}),
		),
		models: Schema.Array(
			Schema.Struct({
				id: Schema.String,
				label: Schema.String,
				input_per_1k: Schema.Number,
				output_per_1k: Schema.Number,
				context_window: Schema.Number,
			}),
		),
	}),
) as unknown as Schema.Codec<AgentNetworkCatalogProvidersGetOutput>;

// The operation
/**
 * List Agent Network catalog providers
 *
 * Returns the static catalog of supported Agent Network providers (OpenAI, Anthropic, …) along with their default upstream host, auth header template, brand color, and known models.
 */
export const agentNetworkCatalogProvidersGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: AgentNetworkCatalogProvidersGetInput,
	outputSchema: AgentNetworkCatalogProvidersGetOutput,
	errors: [Forbidden] as const,
}));
