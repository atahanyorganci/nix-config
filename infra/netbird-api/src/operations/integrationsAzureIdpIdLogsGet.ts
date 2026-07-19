import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsAzureIdpIdLogsGetInput {
	id: number;
}
export const IntegrationsAzureIdpIdLogsGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/azure-idp/{id}/logs" }),
) as unknown as Schema.Codec<IntegrationsAzureIdpIdLogsGetInput>;

// Output Schema
export type IntegrationsAzureIdpIdLogsGetOutput = ReadonlyArray<{
	id: number;
	level: string;
	timestamp: string;
	message: string;
}>;
export const IntegrationsAzureIdpIdLogsGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.Number,
		level: Schema.String,
		timestamp: Schema.String,
		message: Schema.String,
	}),
) as unknown as Schema.Codec<IntegrationsAzureIdpIdLogsGetOutput>;

// The operation
/**
 * Get Azure Integration Sync Logs
 *
 * Retrieves synchronization logs for an Azure IDP integration.
 *
 * @param id - The unique identifier of the Azure IDP integration.
 */
export const integrationsAzureIdpIdLogsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsAzureIdpIdLogsGetInput,
	outputSchema: IntegrationsAzureIdpIdLogsGetOutput,
	errors: [BadRequest, NotFound] as const,
}));
