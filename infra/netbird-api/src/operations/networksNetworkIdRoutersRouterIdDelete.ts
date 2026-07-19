import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksNetworkIdRoutersRouterIdDeleteInput {
	networkId: string;
	routerId: string;
}
export const NetworksNetworkIdRoutersRouterIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	networkId: Schema.String.pipe(T.PathParam()),
	routerId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/networks/{networkId}/routers/{routerId}" }),
) as unknown as Schema.Codec<NetworksNetworkIdRoutersRouterIdDeleteInput>;

// Output Schema
export type NetworksNetworkIdRoutersRouterIdDeleteOutput = void;
export const NetworksNetworkIdRoutersRouterIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<NetworksNetworkIdRoutersRouterIdDeleteOutput>;

// The operation
/**
 * Delete a Network Router
 *
 * Delete a network router
 */
export const networksNetworkIdRoutersRouterIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksNetworkIdRoutersRouterIdDeleteInput,
	outputSchema: NetworksNetworkIdRoutersRouterIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
