import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsOktaScimIdpIdGetInput {
	id: number;
}
export const IntegrationsOktaScimIdpIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/okta-scim-idp/{id}" }),
) as unknown as Schema.Codec<IntegrationsOktaScimIdpIdGetInput>;

// Output Schema
export interface IntegrationsOktaScimIdpIdGetOutput {
	enabled: boolean;
	group_prefixes: ReadonlyArray<string>;
	user_group_prefixes: ReadonlyArray<string>;
	connector_id?: string;
	id: number;
	auth_token: string;
	last_synced_at: string;
}
export const IntegrationsOktaScimIdpIdGetOutput = /*@__PURE__*/ Schema.Struct({
	enabled: Schema.Boolean,
	group_prefixes: Schema.Array(Schema.String),
	user_group_prefixes: Schema.Array(Schema.String),
	connector_id: Schema.optional(Schema.String),
	id: Schema.Number,
	auth_token: Schema.String,
	last_synced_at: Schema.String,
}) as unknown as Schema.Codec<IntegrationsOktaScimIdpIdGetOutput>;

// The operation
/**
 * Get Okta SCIM IDP Integration
 *
 * Retrieves an Okta SCIM IDP integration by ID.
 *
 * @param id - The unique identifier of the Okta SCIM IDP integration.
 */
export const integrationsOktaScimIdpIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsOktaScimIdpIdGetInput,
	outputSchema: IntegrationsOktaScimIdpIdGetOutput,
	errors: [BadRequest, NotFound] as const,
}));
