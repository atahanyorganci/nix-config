import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsScimIdpIdGetInput {
	id: number;
}
export const IntegrationsScimIdpIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/scim-idp/{id}" }),
) as unknown as Schema.Codec<IntegrationsScimIdpIdGetInput>;

// Output Schema
export interface IntegrationsScimIdpIdGetOutput {
	enabled: boolean;
	group_prefixes: ReadonlyArray<string>;
	user_group_prefixes: ReadonlyArray<string>;
	connector_id?: string;
	id: number;
	prefix: string;
	provider: string;
	auth_token: string;
	last_synced_at: string;
}
export const IntegrationsScimIdpIdGetOutput = /*@__PURE__*/ Schema.Struct({
	enabled: Schema.Boolean,
	group_prefixes: Schema.Array(Schema.String),
	user_group_prefixes: Schema.Array(Schema.String),
	connector_id: Schema.optional(Schema.String),
	id: Schema.Number,
	prefix: Schema.String,
	provider: Schema.String,
	auth_token: Schema.String,
	last_synced_at: Schema.String,
}) as unknown as Schema.Codec<IntegrationsScimIdpIdGetOutput>;

// The operation
/**
 * Get SCIM IDP Integration
 *
 * Retrieves an SCIM IDP integration by ID.
 *
 * @param id - The unique identifier of the SCIM IDP integration.
 */
export const integrationsScimIdpIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsScimIdpIdGetInput,
	outputSchema: IntegrationsScimIdpIdGetOutput,
	errors: [BadRequest, NotFound] as const,
}));
