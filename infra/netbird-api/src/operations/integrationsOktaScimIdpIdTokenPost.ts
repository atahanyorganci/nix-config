import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsOktaScimIdpIdTokenPostInput {
	id: number;
}
export const IntegrationsOktaScimIdpIdTokenPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/okta-scim-idp/{id}/token" }),
) as unknown as Schema.Codec<IntegrationsOktaScimIdpIdTokenPostInput>;

// Output Schema
export interface IntegrationsOktaScimIdpIdTokenPostOutput {
	auth_token: string;
}
export const IntegrationsOktaScimIdpIdTokenPostOutput = /*@__PURE__*/ Schema.Struct({
	auth_token: Schema.String,
}) as unknown as Schema.Codec<IntegrationsOktaScimIdpIdTokenPostOutput>;

// The operation
/**
 * Regenerate Okta SCIM Token
 *
 * Regenerates the SCIM API token for an Okta SCIM IDP integration.
 *
 * @param id - The unique identifier of the Okta SCIM IDP integration.
 */
export const integrationsOktaScimIdpIdTokenPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsOktaScimIdpIdTokenPostInput,
	outputSchema: IntegrationsOktaScimIdpIdTokenPostOutput,
	errors: [BadRequest, NotFound] as const,
}));
