import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsOktaScimIdpIdLogsGetInput {
	id: number;
}
export const IntegrationsOktaScimIdpIdLogsGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/okta-scim-idp/{id}/logs" }),
) as unknown as Schema.Codec<IntegrationsOktaScimIdpIdLogsGetInput>;

// Output Schema
export type IntegrationsOktaScimIdpIdLogsGetOutput = ReadonlyArray<{
	id: number;
	level: string;
	timestamp: string;
	message: string;
}>;
export const IntegrationsOktaScimIdpIdLogsGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.Number,
		level: Schema.String,
		timestamp: Schema.String,
		message: Schema.String,
	}),
) as unknown as Schema.Codec<IntegrationsOktaScimIdpIdLogsGetOutput>;

// The operation
/**
 * Get Okta SCIM Integration Sync Logs
 *
 * Retrieves synchronization logs for an Okta SCIM IDP integration.
 *
 * @param id - The unique identifier of the Okta SCIM IDP integration.
 */
export const integrationsOktaScimIdpIdLogsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsOktaScimIdpIdLogsGetInput,
	outputSchema: IntegrationsOktaScimIdpIdLogsGetOutput,
	errors: [BadRequest, NotFound] as const,
}));
