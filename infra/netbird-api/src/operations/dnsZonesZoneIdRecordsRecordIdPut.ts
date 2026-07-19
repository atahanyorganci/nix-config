import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsZonesZoneIdRecordsRecordIdPutInput {
	zoneId: string;
	recordId: string;
	name: string;
	type: "A" | "AAAA" | "CNAME";
	content: string;
	ttl: number;
}
export const DnsZonesZoneIdRecordsRecordIdPutInput = /*@__PURE__*/ Schema.Struct({
	zoneId: Schema.String.pipe(T.PathParam()),
	recordId: Schema.String.pipe(T.PathParam()),
	name: Schema.String,
	type: Schema.Literals(["A", "AAAA", "CNAME"]),
	content: Schema.String,
	ttl: Schema.Number,
}).pipe(
	T.Http({ method: "PUT", path: "/api/dns/zones/{zoneId}/records/{recordId}" }),
) as unknown as Schema.Codec<DnsZonesZoneIdRecordsRecordIdPutInput>;

// Output Schema
export interface DnsZonesZoneIdRecordsRecordIdPutOutput {
	id: string;
	name: string;
	type: "A" | "AAAA" | "CNAME";
	content: string;
	ttl: number;
}
export const DnsZonesZoneIdRecordsRecordIdPutOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	type: Schema.Literals(["A", "AAAA", "CNAME"]),
	content: Schema.String,
	ttl: Schema.Number,
}) as unknown as Schema.Codec<DnsZonesZoneIdRecordsRecordIdPutOutput>;

// The operation
/**
 * Update a DNS Record
 *
 * Updates a DNS record in a zone
 *
 * @param zoneId - The unique identifier of a zone
 * @param recordId - The unique identifier of a DNS record
 */
export const dnsZonesZoneIdRecordsRecordIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsZonesZoneIdRecordsRecordIdPutInput,
	outputSchema: DnsZonesZoneIdRecordsRecordIdPutOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
