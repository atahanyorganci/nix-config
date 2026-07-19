import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsNameserversNsgroupIdDeleteInput {
	nsgroupId: string;
}
export const DnsNameserversNsgroupIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	nsgroupId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/dns/nameservers/{nsgroupId}" }),
) as unknown as Schema.Codec<DnsNameserversNsgroupIdDeleteInput>;

// Output Schema
export type DnsNameserversNsgroupIdDeleteOutput = void;
export const DnsNameserversNsgroupIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<DnsNameserversNsgroupIdDeleteOutput>;

// The operation
/**
 * Delete a Nameserver Group
 *
 * @param nsgroupId - The unique identifier of a Nameserver Group
 */
export const dnsNameserversNsgroupIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsNameserversNsgroupIdDeleteInput,
	outputSchema: DnsNameserversNsgroupIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
