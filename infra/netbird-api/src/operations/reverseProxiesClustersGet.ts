import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ReverseProxiesClustersGetInput {}
export const ReverseProxiesClustersGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/reverse-proxies/clusters" }),
) as unknown as Schema.Codec<ReverseProxiesClustersGetInput>;

// Output Schema
export type ReverseProxiesClustersGetOutput = ReadonlyArray<{
	id: string;
	address: string;
	type: "account" | "shared";
	online: boolean;
	connected_proxies: number;
	supports_custom_ports?: boolean;
	require_subdomain?: boolean;
	supports_crowdsec?: boolean;
	private?: boolean;
}>;
export const ReverseProxiesClustersGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		address: Schema.String,
		type: Schema.Literals(["account", "shared"]),
		online: Schema.Boolean,
		connected_proxies: Schema.Number,
		supports_custom_ports: Schema.optional(Schema.Boolean),
		require_subdomain: Schema.optional(Schema.Boolean),
		supports_crowdsec: Schema.optional(Schema.Boolean),
		private: Schema.optional(Schema.Boolean),
	}),
) as unknown as Schema.Codec<ReverseProxiesClustersGetOutput>;

// The operation
/**
 * List available proxy clusters
 *
 * Returns a list of available proxy clusters with their connection status
 */
export const reverseProxiesClustersGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ReverseProxiesClustersGetInput,
	outputSchema: ReverseProxiesClustersGetOutput,
	errors: [Forbidden] as const,
}));
