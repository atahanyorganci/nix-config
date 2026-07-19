import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsGoogleIdpPostInput {
	group_prefixes?: ReadonlyArray<string>;
	user_group_prefixes?: ReadonlyArray<string>;
	connector_id?: string;
	service_account_key: string;
	customer_id: string;
	sync_interval?: number;
}
export const IntegrationsGoogleIdpPostInput = /*@__PURE__*/ Schema.Struct({
	group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	user_group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	connector_id: Schema.optional(Schema.String),
	service_account_key: Schema.String,
	customer_id: Schema.String,
	sync_interval: Schema.optional(Schema.Number),
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/google-idp" }),
) as unknown as Schema.Codec<IntegrationsGoogleIdpPostInput>;

// Output Schema
export interface IntegrationsGoogleIdpPostOutput {
	enabled: boolean;
	group_prefixes: ReadonlyArray<string>;
	user_group_prefixes: ReadonlyArray<string>;
	connector_id?: string;
	id: number;
	customer_id: string;
	sync_interval: number;
	last_synced_at: string;
}
export const IntegrationsGoogleIdpPostOutput = /*@__PURE__*/ Schema.Struct({
	enabled: Schema.Boolean,
	group_prefixes: Schema.Array(Schema.String),
	user_group_prefixes: Schema.Array(Schema.String),
	connector_id: Schema.optional(Schema.String),
	id: Schema.Number,
	customer_id: Schema.String,
	sync_interval: Schema.Number,
	last_synced_at: Schema.String,
}) as unknown as Schema.Codec<IntegrationsGoogleIdpPostOutput>;

// The operation
/**
 * Create Google IDP Integration
 *
 * Creates a new Google Workspace IDP integration
 */
export const integrationsGoogleIdpPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsGoogleIdpPostInput,
	outputSchema: IntegrationsGoogleIdpPostOutput,
	errors: [BadRequest] as const,
}));
