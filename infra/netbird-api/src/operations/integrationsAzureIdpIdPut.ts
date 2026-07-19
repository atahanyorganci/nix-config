import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import { SensitiveString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface IntegrationsAzureIdpIdPutInput {
	id: number;
	enabled?: boolean;
	group_prefixes?: ReadonlyArray<string>;
	user_group_prefixes?: ReadonlyArray<string>;
	connector_id?: string;
	client_secret?: string | Redacted.Redacted<string>;
	client_id?: string;
	tenant_id?: string;
	sync_interval?: number;
}
export const IntegrationsAzureIdpIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	enabled: Schema.optional(Schema.Boolean),
	group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	user_group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	connector_id: Schema.optional(Schema.String),
	client_secret: Schema.optional(SensitiveString),
	client_id: Schema.optional(Schema.String),
	tenant_id: Schema.optional(Schema.String),
	sync_interval: Schema.optional(Schema.Number),
}).pipe(
	T.Http({ method: "PUT", path: "/api/integrations/azure-idp/{id}" }),
) as unknown as Schema.Codec<IntegrationsAzureIdpIdPutInput>;

// Output Schema
export interface IntegrationsAzureIdpIdPutOutput {
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
export const IntegrationsAzureIdpIdPutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<IntegrationsAzureIdpIdPutOutput>;

// The operation
/**
 * Update Azure IDP Integration
 *
 * Updates an existing Azure AD IDP integration.
 *
 * @param id - The unique identifier of the Azure IDP integration.
 */
export const integrationsAzureIdpIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsAzureIdpIdPutInput,
	outputSchema: IntegrationsAzureIdpIdPutOutput,
	errors: [BadRequest, NotFound] as const,
}));
