import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsAzureIdpIdGetInput {
	id: number;
}
export const IntegrationsAzureIdpIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/azure-idp/{id}" }),
) as unknown as Schema.Codec<IntegrationsAzureIdpIdGetInput>;

// Output Schema
export interface IntegrationsAzureIdpIdGetOutput {
	enabled: boolean;
	group_prefixes: ReadonlyArray<string>;
	user_group_prefixes: ReadonlyArray<string>;
	connector_id?: string;
	id: number;
	client_id: string;
	tenant_id: string;
	sync_interval: number;
	host: string;
	last_synced_at: string;
}
export const IntegrationsAzureIdpIdGetOutput = /*@__PURE__*/ Schema.Struct({
	enabled: Schema.Boolean,
	group_prefixes: Schema.Array(Schema.String),
	user_group_prefixes: Schema.Array(Schema.String),
	connector_id: Schema.optional(Schema.String),
	id: Schema.Number,
	client_id: Schema.String,
	tenant_id: Schema.String,
	sync_interval: Schema.Number,
	host: Schema.String,
	last_synced_at: Schema.String,
}) as unknown as Schema.Codec<IntegrationsAzureIdpIdGetOutput>;

// The operation
/**
 * Get Azure IDP Integration
 *
 * Retrieves an Azure IDP integration by ID.
 *
 * @param id - The unique identifier of the Azure IDP integration.
 */
export const integrationsAzureIdpIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsAzureIdpIdGetInput,
	outputSchema: IntegrationsAzureIdpIdGetOutput,
	errors: [BadRequest, NotFound] as const,
}));
