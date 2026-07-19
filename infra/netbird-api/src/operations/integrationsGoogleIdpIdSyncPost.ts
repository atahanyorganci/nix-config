import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsGoogleIdpIdSyncPostInput {
	id: number;
}
export const IntegrationsGoogleIdpIdSyncPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/api/integrations/google-idp/{id}/sync" }),
) as unknown as Schema.Codec<IntegrationsGoogleIdpIdSyncPostInput>;

// Output Schema
export interface IntegrationsGoogleIdpIdSyncPostOutput {
	result?: string;
}
export const IntegrationsGoogleIdpIdSyncPostOutput = /*@__PURE__*/ Schema.Struct({
	result: Schema.optional(Schema.String),
}) as unknown as Schema.Codec<IntegrationsGoogleIdpIdSyncPostOutput>;

// The operation
/**
 * Sync Google IDP Integration
 *
 * Triggers a manual synchronization for a Google IDP integration.
 *
 * @param id - The unique identifier of the Google IDP integration.
 */
export const integrationsGoogleIdpIdSyncPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsGoogleIdpIdSyncPostInput,
	outputSchema: IntegrationsGoogleIdpIdSyncPostOutput,
	errors: [BadRequest, NotFound] as const,
}));
