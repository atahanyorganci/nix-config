import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsAzureIdpIdSyncPostInput {
	id: number;
}
export const IntegrationsAzureIdpIdSyncPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/azure-idp/{id}/sync" }),
) as unknown as Schema.Codec<IntegrationsAzureIdpIdSyncPostInput>;

// Output Schema
export interface IntegrationsAzureIdpIdSyncPostOutput {
	result?: string;
}
export const IntegrationsAzureIdpIdSyncPostOutput = /*@__PURE__*/ Schema.Struct({
	result: Schema.optional(Schema.String),
}) as unknown as Schema.Codec<IntegrationsAzureIdpIdSyncPostOutput>;

// The operation
/**
 * Sync Azure IDP Integration
 *
 * Triggers a manual synchronization for an Azure IDP integration.
 *
 * @param id - The unique identifier of the Azure IDP integration.
 */
export const integrationsAzureIdpIdSyncPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsAzureIdpIdSyncPostInput,
	outputSchema: IntegrationsAzureIdpIdSyncPostOutput,
	errors: [BadRequest, NotFound] as const,
}));
