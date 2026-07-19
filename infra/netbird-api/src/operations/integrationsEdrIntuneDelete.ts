import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsEdrIntuneDeleteInput {}
export const IntegrationsEdrIntuneDeleteInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "DELETE", path: "/api/integrations/edr/intune" }),
) as unknown as Schema.Codec<IntegrationsEdrIntuneDeleteInput>;

// Output Schema
export type IntegrationsEdrIntuneDeleteOutput = unknown;
export const IntegrationsEdrIntuneDeleteOutput =
	/*@__PURE__*/ Schema.Unknown as unknown as Schema.Codec<IntegrationsEdrIntuneDeleteOutput>;

// The operation
/**
 * Delete EDR Intune Integration
 *
 * Deletes an EDR Intune Integration by its ID.
 */
export const integrationsEdrIntuneDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsEdrIntuneDeleteInput,
	outputSchema: IntegrationsEdrIntuneDeleteOutput,
	errors: [BadRequest, NotFound] as const,
}));
