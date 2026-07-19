import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsAzureIdpIdDeleteInput {
	id: number;
}
export const IntegrationsAzureIdpIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/integrations/azure-idp/{id}" }),
) as unknown as Schema.Codec<IntegrationsAzureIdpIdDeleteInput>;

// Output Schema
export type IntegrationsAzureIdpIdDeleteOutput = unknown;
export const IntegrationsAzureIdpIdDeleteOutput =
	/*@__PURE__*/ Schema.Unknown as unknown as Schema.Codec<IntegrationsAzureIdpIdDeleteOutput>;

// The operation
/**
 * Delete Azure IDP Integration
 *
 * Deletes an Azure IDP integration by ID.
 *
 * @param id - The unique identifier of the Azure IDP integration.
 */
export const integrationsAzureIdpIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsAzureIdpIdDeleteInput,
	outputSchema: IntegrationsAzureIdpIdDeleteOutput,
	errors: [BadRequest, NotFound] as const,
}));
