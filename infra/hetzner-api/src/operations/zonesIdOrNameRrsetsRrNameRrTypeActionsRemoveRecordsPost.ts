import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNameRrsetsRrNameRrTypeActionsRemoveRecordsPostInput {
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
export const ZonesIdOrNameRrsetsRrNameRrTypeActionsRemoveRecordsPostInput = /*@__PURE__*/ Schema.Struct({
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
	T.Http({ method: "POST", path: "/zones/{idOrName}/rrsets/{rrName}/{rrType}/actions/remove_records" }),
) as unknown as Schema.Codec<ZonesIdOrNameRrsetsRrNameRrTypeActionsRemoveRecordsPostInput>;

// Output Schema
export interface ZonesIdOrNameRrsetsRrNameRrTypeActionsRemoveRecordsPostOutput {
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
export const ZonesIdOrNameRrsetsRrNameRrTypeActionsRemoveRecordsPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ZonesIdOrNameRrsetsRrNameRrTypeActionsRemoveRecordsPostOutput>;

// The operation
/**
 * Remove Records from an RRSet
 *
 * Removes resource records (RRs) from an existing [RRSet](#tag/zone-rrsets) in the [Zone](#tag/zones).
 * For convenience, the [RRSet](#tag/zone-rrsets) will be automatically deleted if it doesn't contain any RRs afterwards.
 * Only applicable for [Zones](#tag/zones) in primary mode.
 * #### Operation specific errors
 *
 * @param idOrName - ID or Name of the Zone.
 */
export const zonesIdOrNameRrsetsRrNameRrTypeActionsRemoveRecordsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNameRrsetsRrNameRrTypeActionsRemoveRecordsPostInput,
	outputSchema: ZonesIdOrNameRrsetsRrNameRrTypeActionsRemoveRecordsPostOutput,
}));
