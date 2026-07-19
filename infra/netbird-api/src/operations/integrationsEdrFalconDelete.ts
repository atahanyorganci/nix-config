import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsEdrFalconDeleteInput {}
export const IntegrationsEdrFalconDeleteInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "DELETE", path: "/api/integrations/edr/falcon" }),
) as unknown as Schema.Codec<IntegrationsEdrFalconDeleteInput>;

// Output Schema
export type IntegrationsEdrFalconDeleteOutput = void;
export const IntegrationsEdrFalconDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<IntegrationsEdrFalconDeleteOutput>;

// The operation
/**
 * Delete EDR Falcon Integration
 *
 * Deletes an existing EDR Falcon Integration by its ID.
 */
export const integrationsEdrFalconDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsEdrFalconDeleteInput,
	outputSchema: IntegrationsEdrFalconDeleteOutput,
	errors: [BadRequest, NotFound] as const,
}));
