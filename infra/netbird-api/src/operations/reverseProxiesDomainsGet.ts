import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ReverseProxiesDomainsGetInput {}
export const ReverseProxiesDomainsGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/reverse-proxies/domains" }),
) as unknown as Schema.Codec<ReverseProxiesDomainsGetInput>;

// Output Schema
export type ReverseProxiesDomainsGetOutput = ReadonlyArray<{
	id: string;
	domain: string;
	validated: boolean;
	type: "free" | "custom";
	target_cluster?: string;
	supports_custom_ports?: boolean;
	require_subdomain?: boolean;
	supports_crowdsec?: boolean;
	supports_private?: boolean;
}>;
export const ReverseProxiesDomainsGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		domain: Schema.String,
		validated: Schema.Boolean,
		type: Schema.Literals(["free", "custom"]),
		target_cluster: Schema.optional(Schema.String),
		supports_custom_ports: Schema.optional(Schema.Boolean),
		require_subdomain: Schema.optional(Schema.Boolean),
		supports_crowdsec: Schema.optional(Schema.Boolean),
		supports_private: Schema.optional(Schema.Boolean),
	}),
) as unknown as Schema.Codec<ReverseProxiesDomainsGetOutput>;

// The operation
/**
 * Retrieve Service Domains
 *
 * Get information about domains that can be used for service endpoints.
 */
export const reverseProxiesDomainsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ReverseProxiesDomainsGetInput,
	outputSchema: ReverseProxiesDomainsGetOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
