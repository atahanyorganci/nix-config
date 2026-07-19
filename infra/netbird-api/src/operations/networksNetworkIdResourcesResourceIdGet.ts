import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksNetworkIdResourcesResourceIdGetInput {
	networkId: string;
	resourceId: string;
}
export const NetworksNetworkIdResourcesResourceIdGetInput = /*@__PURE__*/ Schema.Struct({
	networkId: Schema.String.pipe(T.PathParam()),
	resourceId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/networks/{networkId}/resources/{resourceId}" }),
) as unknown as Schema.Codec<NetworksNetworkIdResourcesResourceIdGetInput>;

// Output Schema
export interface NetworksNetworkIdResourcesResourceIdGetOutput {
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
export const NetworksNetworkIdResourcesResourceIdGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<NetworksNetworkIdResourcesResourceIdGetOutput>;

// The operation
/**
 * Retrieve a Network Resource
 *
 * Get information about a Network Resource
 *
 * @param networkId - The unique identifier of a network
 * @param resourceId - The unique identifier of a network resource
 */
export const networksNetworkIdResourcesResourceIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksNetworkIdResourcesResourceIdGetInput,
	outputSchema: NetworksNetworkIdResourcesResourceIdGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
