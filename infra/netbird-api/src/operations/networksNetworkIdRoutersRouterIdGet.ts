import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksNetworkIdRoutersRouterIdGetInput {
	networkId: string;
	routerId: string;
}
export const NetworksNetworkIdRoutersRouterIdGetInput = /*@__PURE__*/ Schema.Struct({
	networkId: Schema.String.pipe(T.PathParam()),
	routerId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/networks/{networkId}/routers/{routerId}" }),
) as unknown as Schema.Codec<NetworksNetworkIdRoutersRouterIdGetInput>;

// Output Schema
export interface NetworksNetworkIdRoutersRouterIdGetOutput {
	id: string;
	peer?: string;
	peer_groups?: ReadonlyArray<string>;
	metric: number;
	masquerade: boolean;
	enabled: boolean;
}
export const NetworksNetworkIdRoutersRouterIdGetOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	peer: Schema.optional(Schema.String),
	peer_groups: Schema.optional(Schema.Array(Schema.String)),
	metric: Schema.Number,
	masquerade: Schema.Boolean,
	enabled: Schema.Boolean,
}) as unknown as Schema.Codec<NetworksNetworkIdRoutersRouterIdGetOutput>;

// The operation
/**
 * Retrieve a Network Router
 *
 * Get information about a Network Router
 *
 * @param networkId - The unique identifier of a network
 * @param routerId - The unique identifier of a router
 */
export const networksNetworkIdRoutersRouterIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksNetworkIdRoutersRouterIdGetInput,
	outputSchema: NetworksNetworkIdRoutersRouterIdGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
