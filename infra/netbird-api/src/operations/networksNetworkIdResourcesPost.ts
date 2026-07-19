import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksNetworkIdResourcesPostInput {
	networkId: string;
	name: string;
	description?: string;
	address: string;
	enabled: boolean;
	groups: ReadonlyArray<string>;
}
export const NetworksNetworkIdResourcesPostInput = /*@__PURE__*/ Schema.Struct({
	networkId: Schema.String.pipe(T.PathParam()),
	name: Schema.String,
	description: Schema.optional(Schema.String),
	address: Schema.String,
	enabled: Schema.Boolean,
	groups: Schema.Array(Schema.String),
}).pipe(
	T.Http({ method: "POST", path: "/api/networks/{networkId}/resources" }),
) as unknown as Schema.Codec<NetworksNetworkIdResourcesPostInput>;

// Output Schema
export interface NetworksNetworkIdResourcesPostOutput {
	id: string;
	type: "host" | "subnet" | "domain";
	groups: ReadonlyArray<{
		id: string;
		name: string;
		peers_count: number;
		resources_count: number;
		issued?: "api" | "integration" | "jwt";
	}>;
	name: string;
	description?: string;
	address: string;
	enabled: boolean;
}
export const NetworksNetworkIdResourcesPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	type: Schema.Literals(["host", "subnet", "domain"]),
	groups: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			name: Schema.String,
			peers_count: Schema.Number,
			resources_count: Schema.Number,
			issued: Schema.optional(Schema.Literals(["api", "integration", "jwt"])),
		}),
	),
	name: Schema.String,
	description: Schema.optional(Schema.String),
	address: Schema.String,
	enabled: Schema.Boolean,
}) as unknown as Schema.Codec<NetworksNetworkIdResourcesPostOutput>;

// The operation
/**
 * Create a Network Resource
 *
 * Creates a Network Resource
 *
 * @param networkId - The unique identifier of a network
 */
export const networksNetworkIdResourcesPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksNetworkIdResourcesPostInput,
	outputSchema: NetworksNetworkIdResourcesPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
