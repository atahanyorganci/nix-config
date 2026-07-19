import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsZonesZoneIdRecordsRecordIdGetInput {
	zoneId: string;
	recordId: string;
}
export const DnsZonesZoneIdRecordsRecordIdGetInput = /*@__PURE__*/ Schema.Struct({
	zoneId: Schema.String.pipe(T.PathParam()),
	recordId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/dns/zones/{zoneId}/records/{recordId}" }),
) as unknown as Schema.Codec<DnsZonesZoneIdRecordsRecordIdGetInput>;

// Output Schema
export interface DnsZonesZoneIdRecordsRecordIdGetOutput {
	id: string;
	name: string;
	type: "A" | "AAAA" | "CNAME";
	content: string;
	ttl: number;
}
export const DnsZonesZoneIdRecordsRecordIdGetOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	type: Schema.Literals(["A", "AAAA", "CNAME"]),
	content: Schema.String,
	ttl: Schema.Number,
}) as unknown as Schema.Codec<DnsZonesZoneIdRecordsRecordIdGetOutput>;

// The operation
/**
 * Retrieve a DNS Record
 *
 * Returns information about a specific DNS record
 *
 * @param zoneId - The unique identifier of a zone
 * @param recordId - The unique identifier of a DNS record
 */
export const dnsZonesZoneIdRecordsRecordIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsZonesZoneIdRecordsRecordIdGetInput,
	outputSchema: DnsZonesZoneIdRecordsRecordIdGetOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
