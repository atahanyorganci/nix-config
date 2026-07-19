import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksGetInput {}
export const NetworksGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/networks" }),
) as unknown as Schema.Codec<NetworksGetInput>;

// Output Schema
export type NetworksGetOutput = ReadonlyArray<{
	id: string;
	routers: ReadonlyArray<string>;
	routing_peers_count: number;
	resources: ReadonlyArray<string>;
	policies: ReadonlyArray<string>;
	name: string;
	description?: string;
}>;
export const NetworksGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		routers: Schema.Array(Schema.String),
		routing_peers_count: Schema.Number,
		resources: Schema.Array(Schema.String),
		policies: Schema.Array(Schema.String),
		name: Schema.String,
		description: Schema.optional(Schema.String),
	}),
) as unknown as Schema.Codec<NetworksGetOutput>;

// The operation
/**
 * List all Networks
 *
 * Returns a list of all networks
 */
export const networksGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksGetInput,
	outputSchema: NetworksGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
