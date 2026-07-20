import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNameZonefileGetInput {
	idOrName: string;
}
export const ZonesIdOrNameZonefileGetInput = /*@__PURE__*/ Schema.Struct({
	idOrName: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/zones/{idOrName}/zonefile" }),
) as unknown as Schema.Codec<ZonesIdOrNameZonefileGetInput>;

// Output Schema
export interface ZonesIdOrNameZonefileGetOutput {
	zonefile: string;
}
export const ZonesIdOrNameZonefileGetOutput = /*@__PURE__*/ Schema.Struct({
	zonefile: Schema.String,
}) as unknown as Schema.Codec<ZonesIdOrNameZonefileGetOutput>;

// The operation
/**
 * Export a Zone file
 *
 * Returns a generated [Zone](#tag/zones) file in BIND (RFC [1034](https://datatracker.ietf.org/doc/html/rfc1034)/[1035](https://datatracker.ietf.org/doc/html/rfc1035)) format.
 * Only applicable for [Zones](#tag/zones) in primary mode.
 * #### Operation specific errors
 *
 * @param idOrName - ID or Name of the Zone.
 */
export const zonesIdOrNameZonefileGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNameZonefileGetInput,
	outputSchema: ZonesIdOrNameZonefileGetOutput,
}));
