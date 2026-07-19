import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksNetworkIdDeleteInput {
	networkId: string;
}
export const NetworksNetworkIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	networkId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/networks/{networkId}" }),
) as unknown as Schema.Codec<NetworksNetworkIdDeleteInput>;

// Output Schema
export type NetworksNetworkIdDeleteOutput = void;
export const NetworksNetworkIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<NetworksNetworkIdDeleteOutput>;

// The operation
/**
 * Delete a Network
 *
 * Delete a network
 *
 * @param networkId - The unique identifier of a network
 */
export const networksNetworkIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksNetworkIdDeleteInput,
	outputSchema: NetworksNetworkIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
