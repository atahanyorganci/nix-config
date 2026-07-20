import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksPostInput {
	name: string;
	ip_range: string;
	labels?: Record<string, string>;
	subnets?: ReadonlyArray<{
		type: "cloud" | "server" | "vswitch";
		ip_range?: string;
		network_zone: string;
		vswitch_id?: number;
	}>;
	routes?: ReadonlyArray<{ destination: string; gateway: string }>;
	expose_routes_to_vswitch?: boolean;
}
export const NetworksPostInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	ip_range: Schema.String,
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
	subnets: Schema.optional(
		Schema.Array(
			Schema.Struct({
				type: Schema.Literals(["cloud", "server", "vswitch"]),
				ip_range: Schema.optional(Schema.String),
				network_zone: Schema.String,
				vswitch_id: Schema.optional(Schema.Number),
			}),
		),
	),
	routes: Schema.optional(
		Schema.Array(
			Schema.Struct({
				destination: Schema.String,
				gateway: Schema.String,
			}),
		),
	),
	expose_routes_to_vswitch: Schema.optional(Schema.Boolean),
}).pipe(T.Http({ method: "POST", path: "/networks" })) as unknown as Schema.Codec<NetworksPostInput>;

// Output Schema
export interface NetworksPostOutput {
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
export const NetworksPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<NetworksPostOutput>;

// The operation
/**
 * Create a Network
 *
 * Creates a [Network](#tag/networks).
 * The provided `ip_range` can only be extended later on, but not reduced.
 * Subnets can be added now or later on using the [add subnet action](#tag/network-actions/add_network_subnet). If you do not specify an `ip_range` for the subnet the first available /24 range will be used.
 * Routes can be added now or later by using the [add route action](#tag/network-actions/add_network_route).
 */
export const networksPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksPostInput,
	outputSchema: NetworksPostOutput,
}));
