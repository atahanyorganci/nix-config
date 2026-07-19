import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsNameserversGetInput {}
export const DnsNameserversGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/dns/nameservers" }),
) as unknown as Schema.Codec<DnsNameserversGetInput>;

// Output Schema
export type DnsNameserversGetOutput = ReadonlyArray<{
	id: string;
	name: string;
	description: string;
	nameservers: ReadonlyArray<{ ip: string; ns_type: "udp"; port: number }>;
	enabled: boolean;
	groups: ReadonlyArray<string>;
	primary: boolean;
	domains: ReadonlyArray<string>;
	search_domains_enabled: boolean;
}>;
export const DnsNameserversGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
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
	}),
) as unknown as Schema.Codec<DnsNameserversGetOutput>;

// The operation
/**
 * List all Nameserver Groups
 *
 * Returns a list of all Nameserver Groups
 */
export const dnsNameserversGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsNameserversGetInput,
	outputSchema: DnsNameserversGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
