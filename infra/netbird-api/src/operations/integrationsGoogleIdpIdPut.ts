import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsGoogleIdpIdPutInput {
	id: number;
	enabled?: boolean;
	group_prefixes?: ReadonlyArray<string>;
	user_group_prefixes?: ReadonlyArray<string>;
	connector_id?: string;
	service_account_key?: string;
	customer_id?: string;
	sync_interval?: number;
}
export const IntegrationsGoogleIdpIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	enabled: Schema.optional(Schema.Boolean),
	group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	user_group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	connector_id: Schema.optional(Schema.String),
	service_account_key: Schema.optional(Schema.String),
	customer_id: Schema.optional(Schema.String),
	sync_interval: Schema.optional(Schema.Number),
}).pipe(
	T.Http({ method: "PUT", path: "/api/integrations/google-idp/{id}" }),
) as unknown as Schema.Codec<IntegrationsGoogleIdpIdPutInput>;

// Output Schema
export interface IntegrationsGoogleIdpIdPutOutput {
	enabled: boolean;
	group_prefixes: ReadonlyArray<string>;
	user_group_prefixes: ReadonlyArray<string>;
	connector_id?: string;
	id: number;
	customer_id: string;
	sync_interval: number;
	last_synced_at: string;
}
export const IntegrationsGoogleIdpIdPutOutput = /*@__PURE__*/ Schema.Struct({
	enabled: Schema.Boolean,
	group_prefixes: Schema.Array(Schema.String),
	user_group_prefixes: Schema.Array(Schema.String),
	connector_id: Schema.optional(Schema.String),
	id: Schema.Number,
	customer_id: Schema.String,
	sync_interval: Schema.Number,
	last_synced_at: Schema.String,
}) as unknown as Schema.Codec<IntegrationsGoogleIdpIdPutOutput>;

// The operation
/**
 * Update Google IDP Integration
 *
 * Updates an existing Google Workspace IDP integration.
 *
 * @param id - The unique identifier of the Google IDP integration.
 */
export const integrationsGoogleIdpIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsGoogleIdpIdPutInput,
	outputSchema: IntegrationsGoogleIdpIdPutOutput,
	errors: [BadRequest, NotFound] as const,
}));
