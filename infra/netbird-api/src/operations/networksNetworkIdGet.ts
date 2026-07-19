import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksNetworkIdGetInput {
	networkId: string;
}
export const NetworksNetworkIdGetInput = /*@__PURE__*/ Schema.Struct({
	networkId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/networks/{networkId}" }),
) as unknown as Schema.Codec<NetworksNetworkIdGetInput>;

// Output Schema
export interface NetworksNetworkIdGetOutput {
	id: string;
	routers: ReadonlyArray<string>;
	routing_peers_count: number;
	resources: ReadonlyArray<string>;
	policies: ReadonlyArray<string>;
	name: string;
	description?: string;
}
export const NetworksNetworkIdGetOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	routers: Schema.Array(Schema.String),
	routing_peers_count: Schema.Number,
	resources: Schema.Array(Schema.String),
	policies: Schema.Array(Schema.String),
	name: Schema.String,
	description: Schema.optional(Schema.String),
}) as unknown as Schema.Codec<NetworksNetworkIdGetOutput>;

// The operation
/**
 * Retrieve a Network
 *
 * Get information about a Network
 *
 * @param networkId - The unique identifier of a network
 */
export const networksNetworkIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksNetworkIdGetInput,
	outputSchema: NetworksNetworkIdGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
