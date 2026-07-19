import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsSettingsGetInput {}
export const DnsSettingsGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/dns/settings" }),
) as unknown as Schema.Codec<DnsSettingsGetInput>;

// Output Schema
export type DnsSettingsGetOutput = unknown;
export const DnsSettingsGetOutput = /*@__PURE__*/ Schema.Unknown as unknown as Schema.Codec<DnsSettingsGetOutput>;

// The operation
/**
 * Retrieve DNS settings
 *
 * Returns a DNS settings object
 */
export const dnsSettingsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsSettingsGetInput,
	outputSchema: DnsSettingsGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
