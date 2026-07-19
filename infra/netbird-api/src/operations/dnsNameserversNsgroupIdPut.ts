import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsNameserversNsgroupIdPutInput {
	nsgroupId: string;
	name: string;
	description: string;
	nameservers: ReadonlyArray<{ ip: string; ns_type: "udp"; port: number }>;
	enabled: boolean;
	groups: ReadonlyArray<string>;
	primary: boolean;
	domains: ReadonlyArray<string>;
	search_domains_enabled: boolean;
}
export const DnsNameserversNsgroupIdPutInput = /*@__PURE__*/ Schema.Struct({
	nsgroupId: Schema.String.pipe(T.PathParam()),
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
}).pipe(
	T.Http({ method: "PUT", path: "/api/dns/nameservers/{nsgroupId}" }),
) as unknown as Schema.Codec<DnsNameserversNsgroupIdPutInput>;

// Output Schema
export interface DnsNameserversNsgroupIdPutOutput {
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
export const DnsNameserversNsgroupIdPutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<DnsNameserversNsgroupIdPutOutput>;

// The operation
/**
 * Update a Nameserver Group
 *
 * Update/Replace a Nameserver Group
 *
 * @param nsgroupId - The unique identifier of a Nameserver Group
 */
export const dnsNameserversNsgroupIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsNameserversNsgroupIdPutInput,
	outputSchema: DnsNameserversNsgroupIdPutOutput,
	errors: [BadRequest, Forbidden] as const,
}));
