import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsScimIdpIdDeleteInput {
	id: number;
}
export const IntegrationsScimIdpIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/integrations/scim-idp/{id}" }),
) as unknown as Schema.Codec<IntegrationsScimIdpIdDeleteInput>;

// Output Schema
export type IntegrationsScimIdpIdDeleteOutput = unknown;
export const IntegrationsScimIdpIdDeleteOutput =
	/*@__PURE__*/ Schema.Unknown as unknown as Schema.Codec<IntegrationsScimIdpIdDeleteOutput>;

// The operation
/**
 * Delete SCIM IDP Integration
 *
 * Deletes an SCIM IDP integration by ID.
 *
 * @param id - The unique identifier of the SCIM IDP integration.
 */
export const integrationsScimIdpIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsScimIdpIdDeleteInput,
	outputSchema: IntegrationsScimIdpIdDeleteOutput,
	errors: [BadRequest, NotFound] as const,
}));
