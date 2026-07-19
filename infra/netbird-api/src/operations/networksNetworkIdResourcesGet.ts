import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksNetworkIdResourcesGetInput {
	networkId: string;
}
export const NetworksNetworkIdResourcesGetInput = /*@__PURE__*/ Schema.Struct({
	networkId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/networks/{networkId}/resources" }),
) as unknown as Schema.Codec<NetworksNetworkIdResourcesGetInput>;

// Output Schema
export type NetworksNetworkIdResourcesGetOutput = ReadonlyArray<{
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
}>;
export const NetworksNetworkIdResourcesGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
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
	}),
) as unknown as Schema.Codec<NetworksNetworkIdResourcesGetOutput>;

// The operation
/**
 * List all Network Resources
 *
 * Returns a list of all resources in a network
 *
 * @param networkId - The unique identifier of a network
 */
export const networksNetworkIdResourcesGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksNetworkIdResourcesGetInput,
	outputSchema: NetworksNetworkIdResourcesGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
