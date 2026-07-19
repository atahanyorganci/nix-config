import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsZonesZoneIdGetInput {
	zoneId: string;
}
export const DnsZonesZoneIdGetInput = /*@__PURE__*/ Schema.Struct({
	zoneId: Schema.String.pipe(T.PathParam()),
}).pipe(T.Http({ method: "GET", path: "/api/dns/zones/{zoneId}" })) as unknown as Schema.Codec<DnsZonesZoneIdGetInput>;

// Output Schema
export interface DnsZonesZoneIdGetOutput {
	id: string;
	records: ReadonlyArray<{ id: string; name: string; type: "A" | "AAAA" | "CNAME"; content: string; ttl: number }>;
	name: string;
	domain: string;
	enabled: boolean;
	enable_search_domain: boolean;
	distribution_groups: ReadonlyArray<string>;
}
export const DnsZonesZoneIdGetOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	records: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			name: Schema.String,
			type: Schema.Literals(["A", "AAAA", "CNAME"]),
			content: Schema.String,
			ttl: Schema.Number,
		}),
	),
	name: Schema.String,
	domain: Schema.String,
	enabled: Schema.Boolean,
	enable_search_domain: Schema.Boolean,
	distribution_groups: Schema.Array(Schema.String),
}) as unknown as Schema.Codec<DnsZonesZoneIdGetOutput>;

// The operation
/**
 * Retrieve a DNS Zone
 *
 * Returns information about a specific DNS zone
 *
 * @param zoneId - The unique identifier of a zone
 */
export const dnsZonesZoneIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsZonesZoneIdGetInput,
	outputSchema: DnsZonesZoneIdGetOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
