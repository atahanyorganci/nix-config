import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsZonesZoneIdRecordsGetInput {
	zoneId: string;
}
export const DnsZonesZoneIdRecordsGetInput = /*@__PURE__*/ Schema.Struct({
	zoneId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/dns/zones/{zoneId}/records" }),
) as unknown as Schema.Codec<DnsZonesZoneIdRecordsGetInput>;

// Output Schema
export type DnsZonesZoneIdRecordsGetOutput = ReadonlyArray<{
	id: string;
	name: string;
	type: "A" | "AAAA" | "CNAME";
	content: string;
	ttl: number;
}>;
export const DnsZonesZoneIdRecordsGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		name: Schema.String,
		type: Schema.Literals(["A", "AAAA", "CNAME"]),
		content: Schema.String,
		ttl: Schema.Number,
	}),
) as unknown as Schema.Codec<DnsZonesZoneIdRecordsGetOutput>;

// The operation
/**
 * List all DNS Records
 *
 * Returns a list of all DNS records in a zone
 *
 * @param zoneId - The unique identifier of a zone
 */
export const dnsZonesZoneIdRecordsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsZonesZoneIdRecordsGetInput,
	outputSchema: DnsZonesZoneIdRecordsGetOutput,
	errors: [Forbidden, NotFound] as const,
}));
