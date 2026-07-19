import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksRoutersGetInput {}
export const NetworksRoutersGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/networks/routers" }),
) as unknown as Schema.Codec<NetworksRoutersGetInput>;

// Output Schema
export type NetworksRoutersGetOutput = ReadonlyArray<{
	id: string;
	peer?: string;
	peer_groups?: ReadonlyArray<string>;
	metric: number;
	masquerade: boolean;
	enabled: boolean;
}>;
export const NetworksRoutersGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		peer: Schema.optional(Schema.String),
		peer_groups: Schema.optional(Schema.Array(Schema.String)),
		metric: Schema.Number,
		masquerade: Schema.Boolean,
		enabled: Schema.Boolean,
	}),
) as unknown as Schema.Codec<NetworksRoutersGetOutput>;

// The operation
/**
 * List all Network Routers
 *
 * Returns a list of all routers in a network
 */
export const networksRoutersGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksRoutersGetInput,
	outputSchema: NetworksRoutersGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
