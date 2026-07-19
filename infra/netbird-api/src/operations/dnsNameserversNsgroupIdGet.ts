import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsNameserversNsgroupIdGetInput {
	nsgroupId: string;
}
export const DnsNameserversNsgroupIdGetInput = /*@__PURE__*/ Schema.Struct({
	nsgroupId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/dns/nameservers/{nsgroupId}" }),
) as unknown as Schema.Codec<DnsNameserversNsgroupIdGetInput>;

// Output Schema
export interface DnsNameserversNsgroupIdGetOutput {
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
export const DnsNameserversNsgroupIdGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<DnsNameserversNsgroupIdGetOutput>;

// The operation
/**
 * Retrieve a Nameserver Group
 *
 * Get information about a Nameserver Groups
 *
 * @param nsgroupId - The unique identifier of a Nameserver Group
 */
export const dnsNameserversNsgroupIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsNameserversNsgroupIdGetInput,
	outputSchema: DnsNameserversNsgroupIdGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
