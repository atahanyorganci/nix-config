import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNameRrsetsRrNameRrTypeActionsSetRecordsPostInput {
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
	records: ReadonlyArray<{ value: string; comment?: string }>;
}
export const ZonesIdOrNameRrsetsRrNameRrTypeActionsSetRecordsPostInput = /*@__PURE__*/ Schema.Struct({
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
	records: Schema.Array(
		Schema.Struct({
			value: Schema.String,
			comment: Schema.optional(Schema.String),
		}),
	),
}).pipe(
	T.Http({ method: "POST", path: "/zones/{idOrName}/rrsets/{rrName}/{rrType}/actions/set_records" }),
) as unknown as Schema.Codec<ZonesIdOrNameRrsetsRrNameRrTypeActionsSetRecordsPostInput>;

// Output Schema
export interface ZonesIdOrNameRrsetsRrNameRrTypeActionsSetRecordsPostOutput {
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
export const ZonesIdOrNameRrsetsRrNameRrTypeActionsSetRecordsPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ZonesIdOrNameRrsetsRrNameRrTypeActionsSetRecordsPostOutput>;

// The operation
/**
 * Set Records of an RRSet
 *
 * Overwrites the resource records (RRs) of an existing [RRSet](#tag/zone-rrsets) in the [Zone](#tag/zones).
 * Only applicable for [Zones](#tag/zones) in primary mode.
 * #### Operation specific errors
 *
 * @param idOrName - ID or Name of the Zone.
 */
export const zonesIdOrNameRrsetsRrNameRrTypeActionsSetRecordsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNameRrsetsRrNameRrTypeActionsSetRecordsPostInput,
	outputSchema: ZonesIdOrNameRrsetsRrNameRrTypeActionsSetRecordsPostOutput,
}));
