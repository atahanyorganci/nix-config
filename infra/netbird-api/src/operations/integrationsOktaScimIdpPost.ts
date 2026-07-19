import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsOktaScimIdpPostInput {
	group_prefixes?: ReadonlyArray<string>;
	user_group_prefixes?: ReadonlyArray<string>;
	connector_id?: string;
	connection_name: string;
}
export const IntegrationsOktaScimIdpPostInput = /*@__PURE__*/ Schema.Struct({
	group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	user_group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	connector_id: Schema.optional(Schema.String),
	connection_name: Schema.String,
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/okta-scim-idp" }),
) as unknown as Schema.Codec<IntegrationsOktaScimIdpPostInput>;

// Output Schema
export interface IntegrationsOktaScimIdpPostOutput {
	enabled: boolean;
	group_prefixes: ReadonlyArray<string>;
	user_group_prefixes: ReadonlyArray<string>;
	connector_id?: string;
	id: number;
	auth_token: string;
	last_synced_at: string;
}
export const IntegrationsOktaScimIdpPostOutput = /*@__PURE__*/ Schema.Struct({
	enabled: Schema.Boolean,
	group_prefixes: Schema.Array(Schema.String),
	user_group_prefixes: Schema.Array(Schema.String),
	connector_id: Schema.optional(Schema.String),
	id: Schema.Number,
	auth_token: Schema.String,
	last_synced_at: Schema.String,
}) as unknown as Schema.Codec<IntegrationsOktaScimIdpPostOutput>;

// The operation
/**
 * Create Okta SCIM IDP Integration
 *
 * Creates a new Okta SCIM IDP integration
 */
export const integrationsOktaScimIdpPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsOktaScimIdpPostInput,
	outputSchema: IntegrationsOktaScimIdpPostOutput,
	errors: [BadRequest] as const,
}));
