import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsGoogleIdpGetInput {}
export const IntegrationsGoogleIdpGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/google-idp" }),
) as unknown as Schema.Codec<IntegrationsGoogleIdpGetInput>;

// Output Schema
export type IntegrationsGoogleIdpGetOutput = ReadonlyArray<{
	enabled: boolean;
	group_prefixes: ReadonlyArray<string>;
	user_group_prefixes: ReadonlyArray<string>;
	connector_id?: string;
	id: number;
	customer_id: string;
	sync_interval: number;
	last_synced_at: string;
}>;
export const IntegrationsGoogleIdpGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		enabled: Schema.Boolean,
		group_prefixes: Schema.Array(Schema.String),
		user_group_prefixes: Schema.Array(Schema.String),
		connector_id: Schema.optional(Schema.String),
		id: Schema.Number,
		customer_id: Schema.String,
		sync_interval: Schema.Number,
		last_synced_at: Schema.String,
	}),
) as unknown as Schema.Codec<IntegrationsGoogleIdpGetOutput>;

// The operation
/**
 * Get All Google IDP Integrations
 *
 * Retrieves all Google Workspace IDP integrations for the authenticated account
 */
export const integrationsGoogleIdpGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsGoogleIdpGetInput,
	outputSchema: IntegrationsGoogleIdpGetOutput,
}));
