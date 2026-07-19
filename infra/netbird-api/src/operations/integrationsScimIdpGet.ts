import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsScimIdpGetInput {}
export const IntegrationsScimIdpGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/scim-idp" }),
) as unknown as Schema.Codec<IntegrationsScimIdpGetInput>;

// Output Schema
export type IntegrationsScimIdpGetOutput = ReadonlyArray<{
	enabled: boolean;
	group_prefixes: ReadonlyArray<string>;
	user_group_prefixes: ReadonlyArray<string>;
	connector_id?: string;
	id: number;
	prefix: string;
	provider: string;
	auth_token: string;
	last_synced_at: string;
}>;
export const IntegrationsScimIdpGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		enabled: Schema.Boolean,
		group_prefixes: Schema.Array(Schema.String),
		user_group_prefixes: Schema.Array(Schema.String),
		connector_id: Schema.optional(Schema.String),
		id: Schema.Number,
		prefix: Schema.String,
		provider: Schema.String,
		auth_token: Schema.String,
		last_synced_at: Schema.String,
	}),
) as unknown as Schema.Codec<IntegrationsScimIdpGetOutput>;

// The operation
/**
 * Get All SCIM IDP Integrations
 *
 * Retrieves all SCIM IDP integrations for the authenticated account
 */
export const integrationsScimIdpGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsScimIdpGetInput,
	outputSchema: IntegrationsScimIdpGetOutput,
}));
