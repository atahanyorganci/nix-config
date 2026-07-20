import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNameRrsetsRrNameRrTypePutInput {
	idOrName: string;
	rrName: string;
	rrType:
		| "A"
		| "AAAA"
		| "CAA"
		| "CNAME"
		| "DS"
		| "HINFO"
		| "HTTPS"
		| "MX"
		| "NS"
		| "PTR"
		| "RP"
		| "SOA"
		| "SRV"
		| "SVCB"
		| "TLSA"
		| "TXT";
	labels?: Record<string, string>;
}
export const ZonesIdOrNameRrsetsRrNameRrTypePutInput = /*@__PURE__*/ Schema.Struct({
	idOrName: Schema.String.pipe(T.PathParam()),
	rrName: Schema.String.pipe(T.PathParam()),
	rrType: Schema.Literals([
		"A",
		"AAAA",
		"CAA",
		"CNAME",
		"DS",
		"HINFO",
		"HTTPS",
		"MX",
		"NS",
		"PTR",
		"RP",
		"SOA",
		"SRV",
		"SVCB",
		"TLSA",
		"TXT",
	]).pipe(T.PathParam()),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).pipe(
	T.Http({ method: "PUT", path: "/zones/{idOrName}/rrsets/{rrName}/{rrType}" }),
) as unknown as Schema.Codec<ZonesIdOrNameRrsetsRrNameRrTypePutInput>;

// Output Schema
export interface ZonesIdOrNameRrsetsRrNameRrTypePutOutput {
	rrset: {
		id: string;
		name: string;
		type:
			| "A"
			| "AAAA"
			| "CAA"
			| "CNAME"
			| "DS"
			| "HINFO"
			| "HTTPS"
			| "MX"
			| "NS"
			| "PTR"
			| "RP"
			| "SOA"
			| "SRV"
			| "SVCB"
			| "TLSA"
			| "TXT";
		ttl: number | null;
		labels: Record<string, string>;
		protection: { change: boolean };
		records: ReadonlyArray<{ value: string; comment?: string }>;
		zone: number;
	};
}
export const ZonesIdOrNameRrsetsRrNameRrTypePutOutput = /*@__PURE__*/ Schema.Struct({
	rrset: Schema.Struct({
		id: Schema.String,
		name: Schema.String,
		type: Schema.Literals([
			"A",
			"AAAA",
			"CAA",
			"CNAME",
			"DS",
			"HINFO",
			"HTTPS",
			"MX",
			"NS",
			"PTR",
			"RP",
			"SOA",
			"SRV",
			"SVCB",
			"TLSA",
			"TXT",
		]),
		ttl: Schema.NullOr(Schema.Number),
		labels: Schema.Record(Schema.String, Schema.String),
		protection: Schema.Struct({
			change: Schema.Boolean,
		}),
		records: Schema.Array(
			Schema.Struct({
				value: Schema.String,
				comment: Schema.optional(Schema.String),
			}),
		),
		zone: Schema.Number,
	}),
}) as unknown as Schema.Codec<ZonesIdOrNameRrsetsRrNameRrTypePutOutput>;

// The operation
/**
 * Update an RRSet
 *
 * Updates an [RRSet](#tag/zone-rrsets) in the [Zone](#tag/zones).
 * Only applicable for [Zones](#tag/zones) in primary mode.
 * #### Operation specific errors
 *
 * @param idOrName - ID or Name of the Zone.
 */
export const zonesIdOrNameRrsetsRrNameRrTypePut = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNameRrsetsRrNameRrTypePutInput,
	outputSchema: ZonesIdOrNameRrsetsRrNameRrTypePutOutput,
}));
