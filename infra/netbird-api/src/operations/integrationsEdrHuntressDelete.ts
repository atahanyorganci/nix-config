import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsEdrHuntressDeleteInput {}
export const IntegrationsEdrHuntressDeleteInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "DELETE", path: "/api/integrations/edr/huntress" }),
) as unknown as Schema.Codec<IntegrationsEdrHuntressDeleteInput>;

// Output Schema
export type IntegrationsEdrHuntressDeleteOutput = unknown;
export const IntegrationsEdrHuntressDeleteOutput =
	/*@__PURE__*/ Schema.Unknown as unknown as Schema.Codec<IntegrationsEdrHuntressDeleteOutput>;

// The operation
/**
 * Delete EDR Huntress Integration
 *
 * Deletes an EDR Huntress Integration by its ID.
 */
export const integrationsEdrHuntressDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsEdrHuntressDeleteInput,
	outputSchema: IntegrationsEdrHuntressDeleteOutput,
	errors: [BadRequest, NotFound] as const,
}));
