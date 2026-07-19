import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsZonesZoneIdPutInput {
	zoneId: string;
	name: string;
	domain: string;
	enabled?: boolean;
	enable_search_domain: boolean;
	distribution_groups: ReadonlyArray<string>;
}
export const DnsZonesZoneIdPutInput = /*@__PURE__*/ Schema.Struct({
	zoneId: Schema.String.pipe(T.PathParam()),
	name: Schema.String,
	domain: Schema.String,
	enabled: Schema.optional(Schema.Boolean),
	enable_search_domain: Schema.Boolean,
	distribution_groups: Schema.Array(Schema.String),
}).pipe(T.Http({ method: "PUT", path: "/api/dns/zones/{zoneId}" })) as unknown as Schema.Codec<DnsZonesZoneIdPutInput>;

// Output Schema
export interface DnsZonesZoneIdPutOutput {
	id: string;
	records: ReadonlyArray<{ id: string; name: string; type: "A" | "AAAA" | "CNAME"; content: string; ttl: number }>;
	name: string;
	domain: string;
	enabled: boolean;
	enable_search_domain: boolean;
	distribution_groups: ReadonlyArray<string>;
}
export const DnsZonesZoneIdPutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<DnsZonesZoneIdPutOutput>;

// The operation
/**
 * Update a DNS Zone
 *
 * Updates a custom DNS zone
 *
 * @param zoneId - The unique identifier of a zone
 */
export const dnsZonesZoneIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsZonesZoneIdPutInput,
	outputSchema: DnsZonesZoneIdPutOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
