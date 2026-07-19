import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsZonesZoneIdRecordsPostInput {
	zoneId: string;
	name: string;
	type: "A" | "AAAA" | "CNAME";
	content: string;
	ttl: number;
}
export const DnsZonesZoneIdRecordsPostInput = /*@__PURE__*/ Schema.Struct({
	zoneId: Schema.String.pipe(T.PathParam()),
	name: Schema.String,
	type: Schema.Literals(["A", "AAAA", "CNAME"]),
	content: Schema.String,
	ttl: Schema.Number,
}).pipe(
	T.Http({ method: "POST", path: "/api/dns/zones/{zoneId}/records" }),
) as unknown as Schema.Codec<DnsZonesZoneIdRecordsPostInput>;

// Output Schema
export interface DnsZonesZoneIdRecordsPostOutput {
	id: string;
	name: string;
	type: "A" | "AAAA" | "CNAME";
	content: string;
	ttl: number;
}
export const DnsZonesZoneIdRecordsPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	type: Schema.Literals(["A", "AAAA", "CNAME"]),
	content: Schema.String,
	ttl: Schema.Number,
}) as unknown as Schema.Codec<DnsZonesZoneIdRecordsPostOutput>;

// The operation
/**
 * Create a DNS Record
 *
 * Creates a new DNS record in a zone
 *
 * @param zoneId - The unique identifier of a zone
 */
export const dnsZonesZoneIdRecordsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsZonesZoneIdRecordsPostInput,
	outputSchema: DnsZonesZoneIdRecordsPostOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
