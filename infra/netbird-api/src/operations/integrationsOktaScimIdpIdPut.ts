import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsOktaScimIdpIdPutInput {
	id: number;
	enabled?: boolean;
	group_prefixes?: ReadonlyArray<string>;
	user_group_prefixes?: ReadonlyArray<string>;
	connector_id?: string;
}
export const IntegrationsOktaScimIdpIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	enabled: Schema.optional(Schema.Boolean),
	group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	user_group_prefixes: Schema.optional(Schema.Array(Schema.String)),
	connector_id: Schema.optional(Schema.String),
}).pipe(
	T.Http({ method: "PUT", path: "/api/integrations/okta-scim-idp/{id}" }),
) as unknown as Schema.Codec<IntegrationsOktaScimIdpIdPutInput>;

// Output Schema
export interface IntegrationsOktaScimIdpIdPutOutput {
	enabled: boolean;
	group_prefixes: ReadonlyArray<string>;
	user_group_prefixes: ReadonlyArray<string>;
	connector_id?: string;
	id: number;
	auth_token: string;
	last_synced_at: string;
}
export const IntegrationsOktaScimIdpIdPutOutput = /*@__PURE__*/ Schema.Struct({
	enabled: Schema.Boolean,
	group_prefixes: Schema.Array(Schema.String),
	user_group_prefixes: Schema.Array(Schema.String),
	connector_id: Schema.optional(Schema.String),
	id: Schema.Number,
	auth_token: Schema.String,
	last_synced_at: Schema.String,
}) as unknown as Schema.Codec<IntegrationsOktaScimIdpIdPutOutput>;

// The operation
/**
 * Update Okta SCIM IDP Integration
 *
 * Updates an existing Okta SCIM IDP integration.
 *
 * @param id - The unique identifier of the Okta SCIM IDP integration.
 */
export const integrationsOktaScimIdpIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsOktaScimIdpIdPutInput,
	outputSchema: IntegrationsOktaScimIdpIdPutOutput,
	errors: [BadRequest, NotFound] as const,
}));
