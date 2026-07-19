import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsEdrSentineloneDeleteInput {}
export const IntegrationsEdrSentineloneDeleteInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "DELETE", path: "/api/integrations/edr/sentinelone" }),
) as unknown as Schema.Codec<IntegrationsEdrSentineloneDeleteInput>;

// Output Schema
export type IntegrationsEdrSentineloneDeleteOutput = unknown;
export const IntegrationsEdrSentineloneDeleteOutput =
	/*@__PURE__*/ Schema.Unknown as unknown as Schema.Codec<IntegrationsEdrSentineloneDeleteOutput>;

// The operation
/**
 * Delete EDR SentinelOne Integration
 *
 * Deletes an EDR SentinelOne Integration by its ID.
 */
export const integrationsEdrSentineloneDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsEdrSentineloneDeleteInput,
	outputSchema: IntegrationsEdrSentineloneDeleteOutput,
	errors: [BadRequest, NotFound] as const,
}));
