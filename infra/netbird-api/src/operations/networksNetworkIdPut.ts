import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksNetworkIdPutInput {
	networkId: string;
	name: string;
	description?: string;
}
export const NetworksNetworkIdPutInput = /*@__PURE__*/ Schema.Struct({
	networkId: Schema.String.pipe(T.PathParam()),
	name: Schema.String,
	description: Schema.optional(Schema.String),
}).pipe(
	T.Http({ method: "PUT", path: "/api/networks/{networkId}" }),
) as unknown as Schema.Codec<NetworksNetworkIdPutInput>;

// Output Schema
export interface NetworksNetworkIdPutOutput {
	id: string;
	routers: ReadonlyArray<string> | null;
	routing_peers_count: number;
	resources: ReadonlyArray<string> | null;
	policies: ReadonlyArray<string>;
	name: string;
	description?: string;
}
export const NetworksNetworkIdPutOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	routers: Schema.NullOr(Schema.Array(Schema.String)),
	routing_peers_count: Schema.Number,
	resources: Schema.NullOr(Schema.Array(Schema.String)),
	policies: Schema.Array(Schema.String),
	name: Schema.String,
	description: Schema.optional(Schema.String),
}) as unknown as Schema.Codec<NetworksNetworkIdPutOutput>;

// The operation
/**
 * Update a Network
 *
 * Update/Replace a Network
 *
 * @param networkId - The unique identifier of a network
 */
export const networksNetworkIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksNetworkIdPutInput,
	outputSchema: NetworksNetworkIdPutOutput,
	errors: [BadRequest, Forbidden] as const,
}));
