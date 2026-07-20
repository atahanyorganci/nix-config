import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNameRrsetsRrNameRrTypeGetInput {
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
}
export const ZonesIdOrNameRrsetsRrNameRrTypeGetInput = /*@__PURE__*/ Schema.Struct({
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
}).pipe(
	T.Http({ method: "GET", path: "/zones/{idOrName}/rrsets/{rrName}/{rrType}" }),
) as unknown as Schema.Codec<ZonesIdOrNameRrsetsRrNameRrTypeGetInput>;

// Output Schema
export interface ZonesIdOrNameRrsetsRrNameRrTypeGetOutput {
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
export const ZonesIdOrNameRrsetsRrNameRrTypeGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ZonesIdOrNameRrsetsRrNameRrTypeGetOutput>;

// The operation
/**
 * Get an RRSet
 *
 * Returns a single [RRSet](#tag/zone-rrsets) from the [Zone](#tag/zones).
 * Only applicable for [Zones](#tag/zones) in primary mode.
 * #### Operation specific errors
 *
 * @param idOrName - ID or Name of the Zone.
 */
export const zonesIdOrNameRrsetsRrNameRrTypeGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNameRrsetsRrNameRrTypeGetInput,
	outputSchema: ZonesIdOrNameRrsetsRrNameRrTypeGetOutput,
}));
