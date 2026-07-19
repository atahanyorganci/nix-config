import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface DnsSettingsPutInput {
	disabled_management_groups: ReadonlyArray<string>;
}
export const DnsSettingsPutInput = /*@__PURE__*/ Schema.Struct({
	disabled_management_groups: Schema.Array(Schema.String),
}).pipe(T.Http({ method: "PUT", path: "/api/dns/settings" })) as unknown as Schema.Codec<DnsSettingsPutInput>;

// Output Schema
export interface DnsSettingsPutOutput {
	disabled_management_groups: ReadonlyArray<string>;
}
export const DnsSettingsPutOutput = /*@__PURE__*/ Schema.Struct({
	disabled_management_groups: Schema.Array(Schema.String),
}) as unknown as Schema.Codec<DnsSettingsPutOutput>;

// The operation
/**
 * Update DNS Settings
 *
 * Updates a DNS settings object
 */
export const dnsSettingsPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: DnsSettingsPutInput,
	outputSchema: DnsSettingsPutOutput,
	errors: [BadRequest, Forbidden] as const,
}));
