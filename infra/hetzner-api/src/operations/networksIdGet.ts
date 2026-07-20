import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksIdGetInput {
	id: number;
}
export const NetworksIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "GET", path: "/networks/{id}" })) as unknown as Schema.Codec<NetworksIdGetInput>;

// Output Schema
export interface NetworksIdGetOutput {
	network?: {
		id: number;
		name: string;
		ip_range: string;
		subnets: ReadonlyArray<{
			type: "cloud" | "server" | "vswitch";
			ip_range?: string;
			network_zone: string;
			gateway: string;
			vswitch_id?: number | null;
		}>;
		routes: ReadonlyArray<{ destination: string; gateway: string }>;
		servers: ReadonlyArray<number>;
		load_balancers?: ReadonlyArray<number>;
		protection: { delete: boolean };
		labels: Record<string, string>;
		created: string;
		expose_routes_to_vswitch: boolean;
	};
}
export const NetworksIdGetOutput = /*@__PURE__*/ Schema.Struct({
	network: Schema.optional(
		Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			ip_range: Schema.String,
			subnets: Schema.Array(
				Schema.Struct({
					type: Schema.Literals(["cloud", "server", "vswitch"]),
					ip_range: Schema.optional(Schema.String),
					network_zone: Schema.String,
					gateway: Schema.String,
					vswitch_id: Schema.optional(Schema.NullOr(Schema.Number)),
				}),
			),
			routes: Schema.Array(
				Schema.Struct({
					destination: Schema.String,
					gateway: Schema.String,
				}),
			),
			servers: Schema.Array(Schema.Number),
			load_balancers: Schema.optional(Schema.Array(Schema.Number)),
			protection: Schema.Struct({
				delete: Schema.Boolean,
			}),
			labels: Schema.Record(Schema.String, Schema.String),
			created: Schema.String,
			expose_routes_to_vswitch: Schema.Boolean,
		}),
	),
}) as unknown as Schema.Codec<NetworksIdGetOutput>;

// The operation
/**
 * Get a Network
 *
 * Get a specific [Network](#tag/networks).
 *
 * @param id - ID of the Network.
 */
export const networksIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksIdGetInput,
	outputSchema: NetworksIdGetOutput,
}));
