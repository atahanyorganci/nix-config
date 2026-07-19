import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsGoogleIdpIdDeleteInput {
	id: number;
}
export const IntegrationsGoogleIdpIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/integrations/google-idp/{id}" }),
) as unknown as Schema.Codec<IntegrationsGoogleIdpIdDeleteInput>;

// Output Schema
export type IntegrationsGoogleIdpIdDeleteOutput = unknown;
export const IntegrationsGoogleIdpIdDeleteOutput =
	/*@__PURE__*/ Schema.Unknown as unknown as Schema.Codec<IntegrationsGoogleIdpIdDeleteOutput>;

// The operation
/**
 * Delete Google IDP Integration
 *
 * Deletes a Google IDP integration by ID.
 *
 * @param id - The unique identifier of the Google IDP integration.
 */
export const integrationsGoogleIdpIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsGoogleIdpIdDeleteInput,
	outputSchema: IntegrationsGoogleIdpIdDeleteOutput,
	errors: [BadRequest, NotFound] as const,
}));
