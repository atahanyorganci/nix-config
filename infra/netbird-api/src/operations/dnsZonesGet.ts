import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsZonesGetInput {}
export const DnsZonesGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/dns/zones" }),
) as unknown as Schema.Codec<DnsZonesGetInput>;

// Output Schema
export type DnsZonesGetOutput = ReadonlyArray<{
	id: string;
	records: ReadonlyArray<{ id: string; name: string; type: "A" | "AAAA" | "CNAME"; content: string; ttl: number }>;
	name: string;
	domain: string;
	enabled: boolean;
	enable_search_domain: boolean;
	distribution_groups: ReadonlyArray<string>;
}>;
export const DnsZonesGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
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
	}),
) as unknown as Schema.Codec<DnsZonesGetOutput>;

// The operation
/**
 * List all DNS Zones
 *
 * Returns a list of all custom DNS zones
 */
export const dnsZonesGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsZonesGetInput,
	outputSchema: DnsZonesGetOutput,
	errors: [Forbidden] as const,
}));
