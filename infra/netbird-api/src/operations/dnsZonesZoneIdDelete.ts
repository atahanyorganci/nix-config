import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsZonesZoneIdDeleteInput {
	zoneId: string;
}
export const DnsZonesZoneIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	zoneId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/dns/zones/{zoneId}" }),
) as unknown as Schema.Codec<DnsZonesZoneIdDeleteInput>;

// Output Schema
export type DnsZonesZoneIdDeleteOutput = void;
export const DnsZonesZoneIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<DnsZonesZoneIdDeleteOutput>;

// The operation
/**
 * Delete a DNS Zone
 *
 * Deletes a custom DNS zone
 *
 * @param zoneId - The unique identifier of a zone
 */
export const dnsZonesZoneIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsZonesZoneIdDeleteInput,
	outputSchema: DnsZonesZoneIdDeleteOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
