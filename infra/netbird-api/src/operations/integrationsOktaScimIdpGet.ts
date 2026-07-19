import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsOktaScimIdpGetInput {}
export const IntegrationsOktaScimIdpGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/okta-scim-idp" }),
) as unknown as Schema.Codec<IntegrationsOktaScimIdpGetInput>;

// Output Schema
export type IntegrationsOktaScimIdpGetOutput = ReadonlyArray<{
	enabled: boolean;
	group_prefixes: ReadonlyArray<string>;
	user_group_prefixes: ReadonlyArray<string>;
	connector_id?: string;
	id: number;
	auth_token: string;
	last_synced_at: string;
}>;
export const IntegrationsOktaScimIdpGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		enabled: Schema.Boolean,
		group_prefixes: Schema.Array(Schema.String),
		user_group_prefixes: Schema.Array(Schema.String),
		connector_id: Schema.optional(Schema.String),
		id: Schema.Number,
		auth_token: Schema.String,
		last_synced_at: Schema.String,
	}),
) as unknown as Schema.Codec<IntegrationsOktaScimIdpGetOutput>;

// The operation
/**
 * Get All Okta SCIM IDP Integrations
 *
 * Retrieves all Okta SCIM IDP integrations for the authenticated account
 */
export const integrationsOktaScimIdpGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsOktaScimIdpGetInput,
	outputSchema: IntegrationsOktaScimIdpGetOutput,
}));
