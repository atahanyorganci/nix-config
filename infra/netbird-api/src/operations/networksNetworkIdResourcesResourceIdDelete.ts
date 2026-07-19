import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksNetworkIdResourcesResourceIdDeleteInput {
	networkId: string;
	resourceId: string;
}
export const NetworksNetworkIdResourcesResourceIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	networkId: Schema.String.pipe(T.PathParam()),
	resourceId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/networks/{networkId}/resources/{resourceId}" }),
) as unknown as Schema.Codec<NetworksNetworkIdResourcesResourceIdDeleteInput>;

// Output Schema
export type NetworksNetworkIdResourcesResourceIdDeleteOutput = void;
export const NetworksNetworkIdResourcesResourceIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<NetworksNetworkIdResourcesResourceIdDeleteOutput>;

// The operation
/**
 * Delete a Network Resource
 *
 * Delete a network resource
 */
export const networksNetworkIdResourcesResourceIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksNetworkIdResourcesResourceIdDeleteInput,
	outputSchema: NetworksNetworkIdResourcesResourceIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
