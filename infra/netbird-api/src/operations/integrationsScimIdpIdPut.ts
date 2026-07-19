import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsScimIdpIdPutInput {
	id: number;
	enabled?: boolean;
	group_prefixes?: ReadonlyArray<string>;
	user_group_prefixes?: ReadonlyArray<string>;
	connector_id?: string;
	prefix?: string;
}
export const IntegrationsScimIdpIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	enabled: Schema.optional(Schema.Boolean),
	group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	user_group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	connector_id: Schema.optional(Schema.String),
	prefix: Schema.optional(Schema.String),
}).pipe(
	T.Http({ method: "PUT", path: "/api/integrations/scim-idp/{id}" }),
) as unknown as Schema.Codec<IntegrationsScimIdpIdPutInput>;

// Output Schema
export interface IntegrationsScimIdpIdPutOutput {
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
export const IntegrationsScimIdpIdPutOutput = /*@__PURE__*/ Schema.Struct({
	enabled: Schema.Boolean,
	group_prefixes: Schema.Array(Schema.String),
	user_group_prefixes: Schema.Array(Schema.String),
	connector_id: Schema.optional(Schema.String),
	id: Schema.Number,
	prefix: Schema.String,
	provider: Schema.String,
	auth_token: Schema.String,
	last_synced_at: Schema.String,
}) as unknown as Schema.Codec<IntegrationsScimIdpIdPutOutput>;

// The operation
/**
 * Update SCIM IDP Integration
 *
 * Updates an existing SCIM IDP Integration.
 *
 * @param id - The unique identifier of the SCIM IDP integration.
 */
export const integrationsScimIdpIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsScimIdpIdPutInput,
	outputSchema: IntegrationsScimIdpIdPutOutput,
	errors: [BadRequest, NotFound] as const,
}));
