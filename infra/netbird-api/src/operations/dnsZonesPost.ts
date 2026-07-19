import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsZonesPostInput {
	name: string;
	domain: string;
	enabled?: boolean;
	enable_search_domain: boolean;
	distribution_groups: ReadonlyArray<string>;
}
export const DnsZonesPostInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	domain: Schema.String,
	enabled: Schema.optional(Schema.Boolean),
	enable_search_domain: Schema.Boolean,
	distribution_groups: Schema.Array(Schema.String),
}).pipe(T.Http({ method: "POST", path: "/api/dns/zones" })) as unknown as Schema.Codec<DnsZonesPostInput>;

// Output Schema
export interface DnsZonesPostOutput {
	id: string;
	records: ReadonlyArray<{ id: string; name: string; type: "A" | "AAAA" | "CNAME"; content: string; ttl: number }>;
	name: string;
	domain: string;
	enabled: boolean;
	enable_search_domain: boolean;
	distribution_groups: ReadonlyArray<string>;
}
export const DnsZonesPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<DnsZonesPostOutput>;

// The operation
/**
 * Create a DNS Zone
 *
 * Creates a new custom DNS zone
 */
export const dnsZonesPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsZonesPostInput,
	outputSchema: DnsZonesPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
