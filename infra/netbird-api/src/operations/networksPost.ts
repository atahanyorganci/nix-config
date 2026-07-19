import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksPostInput {
	name: string;
	description?: string;
}
export const NetworksPostInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	description: Schema.optional(Schema.String),
}).pipe(T.Http({ method: "POST", path: "/api/networks" })) as unknown as Schema.Codec<NetworksPostInput>;

// Output Schema
export interface NetworksPostOutput {
	id: string;
	routers: ReadonlyArray<string>;
	routing_peers_count: number;
	resources: ReadonlyArray<string>;
	policies: ReadonlyArray<string>;
	name: string;
	description?: string;
}
export const NetworksPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	routers: Schema.Array(Schema.String),
	routing_peers_count: Schema.Number,
	resources: Schema.Array(Schema.String),
	policies: Schema.Array(Schema.String),
	name: Schema.String,
	description: Schema.optional(Schema.String),
}) as unknown as Schema.Codec<NetworksPostOutput>;

// The operation
/**
 * Create a Network
 *
 * Creates a Network
 */
export const networksPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksPostInput,
	outputSchema: NetworksPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
