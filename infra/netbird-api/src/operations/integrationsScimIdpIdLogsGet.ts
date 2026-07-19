import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsScimIdpIdLogsGetInput {
	id: number;
}
export const IntegrationsScimIdpIdLogsGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/scim-idp/{id}/logs" }),
) as unknown as Schema.Codec<IntegrationsScimIdpIdLogsGetInput>;

// Output Schema
export type IntegrationsScimIdpIdLogsGetOutput = ReadonlyArray<{
	id: number;
	level: string;
	timestamp: string;
	message: string;
}>;
export const IntegrationsScimIdpIdLogsGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.Number,
		level: Schema.String,
		timestamp: Schema.String,
		message: Schema.String,
	}),
) as unknown as Schema.Codec<IntegrationsScimIdpIdLogsGetOutput>;

// The operation
/**
 * Get SCIM Integration Sync Logs
 *
 * Retrieves synchronization logs for a SCIM IDP integration.
 *
 * @param id - The unique identifier of the SCIM IDP integration.
 */
export const integrationsScimIdpIdLogsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsScimIdpIdLogsGetInput,
	outputSchema: IntegrationsScimIdpIdLogsGetOutput,
	errors: [BadRequest, NotFound] as const,
}));
