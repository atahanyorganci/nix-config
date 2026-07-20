import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNameRrsetsPostInput {
	idOrName: string;
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
	ttl?: number | null;
	records: ReadonlyArray<{ value: string; comment?: string }>;
	labels?: Record<string, string>;
}
export const ZonesIdOrNameRrsetsPostInput = /*@__PURE__*/ Schema.Struct({
	idOrName: Schema.String.pipe(T.PathParam()),
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
	ttl: Schema.optional(Schema.NullOr(Schema.Number)),
	records: Schema.Array(
		Schema.Struct({
			value: Schema.String,
			comment: Schema.optional(Schema.String),
		}),
	),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).pipe(
	T.Http({ method: "POST", path: "/zones/{idOrName}/rrsets" }),
) as unknown as Schema.Codec<ZonesIdOrNameRrsetsPostInput>;

// Output Schema
export interface ZonesIdOrNameRrsetsPostOutput {
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
	action: {
		id: number;
		command: string;
		status: "running" | "success" | "error";
		started: string;
		finished: string | null;
		progress: number;
		resources: ReadonlyArray<{ id: number; type: string }>;
		error: { code: string; message: string } | null;
	};
}
export const ZonesIdOrNameRrsetsPostOutput = /*@__PURE__*/ Schema.Struct({
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
	action: Schema.Struct({
		id: Schema.Number,
		command: Schema.String,
		status: Schema.Literals(["running", "success", "error"]),
		started: Schema.String,
		finished: Schema.NullOr(Schema.String),
		progress: Schema.Number,
		resources: Schema.Array(
			Schema.Struct({
				id: Schema.Number,
				type: Schema.String,
			}),
		),
		error: Schema.NullOr(
			Schema.Struct({
				code: Schema.String,
				message: Schema.String,
			}),
		),
	}),
}) as unknown as Schema.Codec<ZonesIdOrNameRrsetsPostOutput>;

// The operation
/**
 * Create an RRSet
 *
 * Create an [RRSet](#tag/zone-rrsets) in the [Zone](#tag/zones).
 * Only applicable for [Zones](#tag/zones) in primary mode.
 * #### Operation specific errors
 *
 * @param idOrName - ID or Name of the Zone.
 */
export const zonesIdOrNameRrsetsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNameRrsetsPostInput,
	outputSchema: ZonesIdOrNameRrsetsPostOutput,
}));
