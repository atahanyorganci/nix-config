import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsScimIdpPostInput {
	group_prefixes?: ReadonlyArray<string>;
	user_group_prefixes?: ReadonlyArray<string>;
	connector_id?: string;
	prefix: string;
	provider: string;
}
export const IntegrationsScimIdpPostInput = /*@__PURE__*/ Schema.Struct({
	group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	user_group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	connector_id: Schema.optional(Schema.String),
	prefix: Schema.String,
	provider: Schema.String,
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/scim-idp" }),
) as unknown as Schema.Codec<IntegrationsScimIdpPostInput>;

// Output Schema
export interface IntegrationsScimIdpPostOutput {
	enabled: boolean;
	group_prefixes: ReadonlyArray<string>;
	user_group_prefixes: ReadonlyArray<string>;
	connector_id?: string;
	id: number;
	prefix: string;
	provider: string;
	auth_token: string;
	last_synced_at: string;
}
export const IntegrationsScimIdpPostOutput = /*@__PURE__*/ Schema.Struct({
	enabled: Schema.Boolean,
	group_prefixes: Schema.Array(Schema.String),
	user_group_prefixes: Schema.Array(Schema.String),
	connector_id: Schema.optional(Schema.String),
	id: Schema.Number,
	prefix: Schema.String,
	provider: Schema.String,
	auth_token: Schema.String,
	last_synced_at: Schema.String,
}) as unknown as Schema.Codec<IntegrationsScimIdpPostOutput>;

// The operation
/**
 * Create SCIM IDP Integration
 *
 * Creates a new SCIM integration
 */
export const integrationsScimIdpPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsScimIdpPostInput,
	outputSchema: IntegrationsScimIdpPostOutput,
	errors: [BadRequest] as const,
}));
