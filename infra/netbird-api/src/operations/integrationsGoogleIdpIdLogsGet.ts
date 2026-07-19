import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsGoogleIdpIdLogsGetInput {
	id: number;
}
export const IntegrationsGoogleIdpIdLogsGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/integrations/google-idp/{id}/logs" }),
) as unknown as Schema.Codec<IntegrationsGoogleIdpIdLogsGetInput>;

// Output Schema
export type IntegrationsGoogleIdpIdLogsGetOutput = ReadonlyArray<{
	id: number;
	level: string;
	timestamp: string;
	message: string;
}>;
export const IntegrationsGoogleIdpIdLogsGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.Number,
		level: Schema.String,
		timestamp: Schema.String,
		message: Schema.String,
	}),
) as unknown as Schema.Codec<IntegrationsGoogleIdpIdLogsGetOutput>;

// The operation
/**
 * Get Google Integration Sync Logs
 *
 * Retrieves synchronization logs for a Google IDP integration.
 *
 * @param id - The unique identifier of the Google IDP integration.
 */
export const integrationsGoogleIdpIdLogsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsGoogleIdpIdLogsGetInput,
	outputSchema: IntegrationsGoogleIdpIdLogsGetOutput,
	errors: [BadRequest, NotFound] as const,
}));
