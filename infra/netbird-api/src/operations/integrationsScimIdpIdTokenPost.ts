import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsScimIdpIdTokenPostInput {
	id: number;
}
export const IntegrationsScimIdpIdTokenPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/scim-idp/{id}/token" }),
) as unknown as Schema.Codec<IntegrationsScimIdpIdTokenPostInput>;

// Output Schema
export interface IntegrationsScimIdpIdTokenPostOutput {
	auth_token: string;
}
export const IntegrationsScimIdpIdTokenPostOutput = /*@__PURE__*/ Schema.Struct({
	auth_token: Schema.String,
}) as unknown as Schema.Codec<IntegrationsScimIdpIdTokenPostOutput>;

// The operation
/**
 * Regenerate SCIM Token
 *
 * Regenerates the SCIM API token for an SCIM IDP integration.
 *
 * @param id - The unique identifier of the SCIM IDP integration.
 */
export const integrationsScimIdpIdTokenPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsScimIdpIdTokenPostInput,
	outputSchema: IntegrationsScimIdpIdTokenPostOutput,
	errors: [BadRequest, NotFound] as const,
}));
