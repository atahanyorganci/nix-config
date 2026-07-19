import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksNetworkIdRoutersPostInput {
	networkId: string;
	peer?: string;
	peer_groups?: ReadonlyArray<string>;
	metric: number;
	masquerade: boolean;
	enabled: boolean;
}
export const NetworksNetworkIdRoutersPostInput = /*@__PURE__*/ Schema.Struct({
	networkId: Schema.String.pipe(T.PathParam()),
	peer: Schema.optional(Schema.String),
	peer_groups: Schema.optional(Schema.Array(Schema.String)),
	metric: Schema.Number,
	masquerade: Schema.Boolean,
	enabled: Schema.Boolean,
}).pipe(
	T.Http({ method: "POST", path: "/api/networks/{networkId}/routers" }),
) as unknown as Schema.Codec<NetworksNetworkIdRoutersPostInput>;

// Output Schema
export interface NetworksNetworkIdRoutersPostOutput {
	id: string;
	peer?: string;
	peer_groups?: ReadonlyArray<string>;
	metric: number;
	masquerade: boolean;
	enabled: boolean;
}
export const NetworksNetworkIdRoutersPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	peer: Schema.optional(Schema.String),
	peer_groups: Schema.optional(Schema.Array(Schema.String)),
	metric: Schema.Number,
	masquerade: Schema.Boolean,
	enabled: Schema.Boolean,
}) as unknown as Schema.Codec<NetworksNetworkIdRoutersPostOutput>;

// The operation
/**
 * Create a Network Router
 *
 * Creates a Network Router
 *
 * @param networkId - The unique identifier of a network
 */
export const networksNetworkIdRoutersPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksNetworkIdRoutersPostInput,
	outputSchema: NetworksNetworkIdRoutersPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
