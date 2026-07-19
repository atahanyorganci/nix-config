import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsAzureIdpGetInput {}
export const IntegrationsAzureIdpGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/azure-idp" }),
) as unknown as Schema.Codec<IntegrationsAzureIdpGetInput>;

// Output Schema
export type IntegrationsAzureIdpGetOutput = ReadonlyArray<{
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
}>;
export const IntegrationsAzureIdpGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
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
	}),
) as unknown as Schema.Codec<IntegrationsAzureIdpGetOutput>;

// The operation
/**
 * Get All Azure IDP Integrations
 *
 * Retrieves all Azure AD IDP integrations for the authenticated account
 */
export const integrationsAzureIdpGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsAzureIdpGetInput,
	outputSchema: IntegrationsAzureIdpGetOutput,
}));
