import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsGoogleIdpIdGetInput {
	id: number;
}
export const IntegrationsGoogleIdpIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/google-idp/{id}" }),
) as unknown as Schema.Codec<IntegrationsGoogleIdpIdGetInput>;

// Output Schema
export interface IntegrationsGoogleIdpIdGetOutput {
	enabled: boolean;
	group_prefixes: ReadonlyArray<string>;
	user_group_prefixes: ReadonlyArray<string>;
	connector_id?: string;
	id: number;
	customer_id: string;
	sync_interval: number;
	last_synced_at: string;
}
export const IntegrationsGoogleIdpIdGetOutput = /*@__PURE__*/ Schema.Struct({
	enabled: Schema.Boolean,
	group_prefixes: Schema.Array(Schema.String),
	user_group_prefixes: Schema.Array(Schema.String),
	connector_id: Schema.optional(Schema.String),
	id: Schema.Number,
	customer_id: Schema.String,
	sync_interval: Schema.Number,
	last_synced_at: Schema.String,
}) as unknown as Schema.Codec<IntegrationsGoogleIdpIdGetOutput>;

// The operation
/**
 * Get Google IDP Integration
 *
 * Retrieves a Google IDP integration by ID.
 *
 * @param id - The unique identifier of the Google IDP integration.
 */
export const integrationsGoogleIdpIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsGoogleIdpIdGetInput,
	outputSchema: IntegrationsGoogleIdpIdGetOutput,
	errors: [BadRequest, NotFound] as const,
}));
