import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksNetworkIdResourcesResourceIdPutInput {
	networkId: string;
	resourceId: string;
	name: string;
	description?: string;
	address: string;
	enabled: boolean;
	groups: ReadonlyArray<string>;
}
export const NetworksNetworkIdResourcesResourceIdPutInput = /*@__PURE__*/ Schema.Struct({
	networkId: Schema.String.pipe(T.PathParam()),
	resourceId: Schema.String.pipe(T.PathParam()),
	name: Schema.String,
	description: Schema.optional(Schema.String),
	address: Schema.String,
	enabled: Schema.Boolean,
	groups: Schema.Array(Schema.String),
}).pipe(
	T.Http({ method: "PUT", path: "/api/networks/{networkId}/resources/{resourceId}" }),
) as unknown as Schema.Codec<NetworksNetworkIdResourcesResourceIdPutInput>;

// Output Schema
export interface NetworksNetworkIdResourcesResourceIdPutOutput {
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
export const NetworksNetworkIdResourcesResourceIdPutOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<NetworksNetworkIdResourcesResourceIdPutOutput>;

// The operation
/**
 * Update a Network Resource
 *
 * @param networkId - The unique identifier of a network
 * @param resourceId - The unique identifier of a resource
 */
export const networksNetworkIdResourcesResourceIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksNetworkIdResourcesResourceIdPutInput,
	outputSchema: NetworksNetworkIdResourcesResourceIdPutOutput,
	errors: [BadRequest, Forbidden] as const,
}));
