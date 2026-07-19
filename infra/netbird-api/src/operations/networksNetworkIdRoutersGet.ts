import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksNetworkIdRoutersGetInput {
	networkId: string;
}
export const NetworksNetworkIdRoutersGetInput = /*@__PURE__*/ Schema.Struct({
	networkId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/networks/{networkId}/routers" }),
) as unknown as Schema.Codec<NetworksNetworkIdRoutersGetInput>;

// Output Schema
export type NetworksNetworkIdRoutersGetOutput = ReadonlyArray<{
	id: string;
	peer?: string;
	peer_groups?: ReadonlyArray<string>;
	metric: number;
	masquerade: boolean;
	enabled: boolean;
}>;
export const NetworksNetworkIdRoutersGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		peer: Schema.optional(Schema.String),
		peer_groups: Schema.optional(Schema.Array(Schema.String)),
		metric: Schema.Number,
		masquerade: Schema.Boolean,
		enabled: Schema.Boolean,
	}),
) as unknown as Schema.Codec<NetworksNetworkIdRoutersGetOutput>;

// The operation
/**
 * List all Network Routers
 *
 * Returns a list of all routers in a network
 *
 * @param networkId - The unique identifier of a network
 */
export const networksNetworkIdRoutersGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksNetworkIdRoutersGetInput,
	outputSchema: NetworksNetworkIdRoutersGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
