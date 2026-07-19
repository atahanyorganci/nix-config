import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsZonesZoneIdRecordsRecordIdDeleteInput {
	zoneId: string;
	recordId: string;
}
export const DnsZonesZoneIdRecordsRecordIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	zoneId: Schema.String.pipe(T.PathParam()),
	recordId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/dns/zones/{zoneId}/records/{recordId}" }),
) as unknown as Schema.Codec<DnsZonesZoneIdRecordsRecordIdDeleteInput>;

// Output Schema
export type DnsZonesZoneIdRecordsRecordIdDeleteOutput = void;
export const DnsZonesZoneIdRecordsRecordIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<DnsZonesZoneIdRecordsRecordIdDeleteOutput>;

// The operation
/**
 * Delete a DNS Record
 *
 * Deletes a DNS record from a zone
 *
 * @param zoneId - The unique identifier of a zone
 * @param recordId - The unique identifier of a DNS record
 */
export const dnsZonesZoneIdRecordsRecordIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsZonesZoneIdRecordsRecordIdDeleteInput,
	outputSchema: DnsZonesZoneIdRecordsRecordIdDeleteOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
