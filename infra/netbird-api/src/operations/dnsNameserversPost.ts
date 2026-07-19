import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsNameserversPostInput {
	name: string;
	description: string;
	nameservers: ReadonlyArray<{ ip: string; ns_type: "udp"; port: number }>;
	enabled: boolean;
	groups: ReadonlyArray<string>;
	primary: boolean;
	domains: ReadonlyArray<string>;
	search_domains_enabled: boolean;
}
export const DnsNameserversPostInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	description: Schema.String,
	nameservers: Schema.Array(
		Schema.Struct({
			ip: Schema.String,
			ns_type: Schema.Literals(["udp"]),
			port: Schema.Number,
		}),
	),
	enabled: Schema.Boolean,
	groups: Schema.Array(Schema.String),
	primary: Schema.Boolean,
	domains: Schema.Array(Schema.String),
	search_domains_enabled: Schema.Boolean,
}).pipe(T.Http({ method: "POST", path: "/api/dns/nameservers" })) as unknown as Schema.Codec<DnsNameserversPostInput>;

// Output Schema
export interface DnsNameserversPostOutput {
	id: string;
	name: string;
	description: string;
	nameservers: ReadonlyArray<{ ip: string; ns_type: "udp"; port: number }>;
	enabled: boolean;
	groups: ReadonlyArray<string>;
	primary: boolean;
	domains: ReadonlyArray<string>;
	search_domains_enabled: boolean;
}
export const DnsNameserversPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	description: Schema.String,
	nameservers: Schema.Array(
		Schema.Struct({
			ip: Schema.String,
			ns_type: Schema.Literals(["udp"]),
			port: Schema.Number,
		}),
	),
	enabled: Schema.Boolean,
	groups: Schema.Array(Schema.String),
	primary: Schema.Boolean,
	domains: Schema.Array(Schema.String),
	search_domains_enabled: Schema.Boolean,
}) as unknown as Schema.Codec<DnsNameserversPostOutput>;

// The operation
/**
 * Create a Nameserver Group
 *
 * Creates a Nameserver Group
 */
export const dnsNameserversPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsNameserversPostInput,
	outputSchema: DnsNameserversPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
