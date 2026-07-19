import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsOktaScimIdpIdDeleteInput {
	id: number;
}
export const IntegrationsOktaScimIdpIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/integrations/okta-scim-idp/{id}" }),
) as unknown as Schema.Codec<IntegrationsOktaScimIdpIdDeleteInput>;

// Output Schema
export type IntegrationsOktaScimIdpIdDeleteOutput = unknown;
export const IntegrationsOktaScimIdpIdDeleteOutput =
	/*@__PURE__*/ Schema.Unknown as unknown as Schema.Codec<IntegrationsOktaScimIdpIdDeleteOutput>;

// The operation
/**
 * Delete Okta SCIM IDP Integration
 *
 * Deletes an Okta SCIM IDP integration by ID.
 *
 * @param id - The unique identifier of the Okta SCIM IDP integration.
 */
export const integrationsOktaScimIdpIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsOktaScimIdpIdDeleteInput,
	outputSchema: IntegrationsOktaScimIdpIdDeleteOutput,
	errors: [BadRequest, NotFound] as const,
}));
