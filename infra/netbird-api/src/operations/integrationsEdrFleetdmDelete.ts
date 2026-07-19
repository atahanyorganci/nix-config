import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IntegrationsEdrFleetdmDeleteInput {}
export const IntegrationsEdrFleetdmDeleteInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "DELETE", path: "/api/integrations/edr/fleetdm" }),
) as unknown as Schema.Codec<IntegrationsEdrFleetdmDeleteInput>;

// Output Schema
export type IntegrationsEdrFleetdmDeleteOutput = unknown;
export const IntegrationsEdrFleetdmDeleteOutput =
	/*@__PURE__*/ Schema.Unknown as unknown as Schema.Codec<IntegrationsEdrFleetdmDeleteOutput>;

// The operation
/**
 * Delete EDR FleetDM Integration
 *
 * Deletes an EDR FleetDM Integration by its ID.
 */
export const integrationsEdrFleetdmDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: IntegrationsEdrFleetdmDeleteInput,
	outputSchema: IntegrationsEdrFleetdmDeleteOutput,
	errors: [BadRequest, NotFound] as const,
}));
