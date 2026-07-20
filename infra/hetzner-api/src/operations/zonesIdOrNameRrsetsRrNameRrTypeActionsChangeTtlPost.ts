import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNameRrsetsRrNameRrTypeActionsChangeTtlPostInput {
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
	ttl: number | null;
}
export const ZonesIdOrNameRrsetsRrNameRrTypeActionsChangeTtlPostInput = /*@__PURE__*/ Schema.Struct({
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
	ttl: Schema.NullOr(Schema.Number),
}).pipe(
	T.Http({ method: "POST", path: "/zones/{idOrName}/rrsets/{rrName}/{rrType}/actions/change_ttl" }),
) as unknown as Schema.Codec<ZonesIdOrNameRrsetsRrNameRrTypeActionsChangeTtlPostInput>;

// Output Schema
export interface ZonesIdOrNameRrsetsRrNameRrTypeActionsChangeTtlPostOutput {
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
export const ZonesIdOrNameRrsetsRrNameRrTypeActionsChangeTtlPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ZonesIdOrNameRrsetsRrNameRrTypeActionsChangeTtlPostOutput>;

// The operation
/**
 * Change an RRSet's TTL
 *
 * Changes the Time To Live (TTL) of an [RRSet](#tag/zone-rrsets) in the [Zone](#tag/zones).
 * Only applicable for [Zones](#tag/zones) in primary mode.
 * #### Operation specific errors
 *
 * @param idOrName - ID or Name of the Zone.
 */
export const zonesIdOrNameRrsetsRrNameRrTypeActionsChangeTtlPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNameRrsetsRrNameRrTypeActionsChangeTtlPostInput,
	outputSchema: ZonesIdOrNameRrsetsRrNameRrTypeActionsChangeTtlPostOutput,
}));
