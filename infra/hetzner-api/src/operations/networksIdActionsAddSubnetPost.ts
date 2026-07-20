import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksIdActionsAddSubnetPostInput {
	id: number;
	type: "cloud" | "server" | "vswitch";
	ip_range?: string;
	network_zone: string;
	vswitch_id?: number;
}
export const NetworksIdActionsAddSubnetPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	type: Schema.Literals(["cloud", "server", "vswitch"]),
	ip_range: Schema.optional(Schema.String),
	network_zone: Schema.String,
	vswitch_id: Schema.optional(Schema.Number),
}).pipe(
	T.Http({ method: "POST", path: "/networks/{id}/actions/add_subnet" }),
) as unknown as Schema.Codec<NetworksIdActionsAddSubnetPostInput>;

// Output Schema
export interface NetworksIdActionsAddSubnetPostOutput {
	action: {
		id: number;
		command: string;
		status: "running" | "success" | "error";
		started: string;
		finished: string | null;
		progress: number;
		resources: ReadonlyArray<{ id: number; type: string }>;
		error: { code: string; message: string } | null;
	};
}
export const NetworksIdActionsAddSubnetPostOutput = /*@__PURE__*/ Schema.Struct({
	action: Schema.Struct({
		id: Schema.Number,
		command: Schema.String,
		status: Schema.Literals(["running", "success", "error"]),
		started: Schema.String,
		finished: Schema.NullOr(Schema.String),
		progress: Schema.Number,
		resources: Schema.Array(
			Schema.Struct({
				id: Schema.Number,
				type: Schema.String,
			}),
		),
		error: Schema.NullOr(
			Schema.Struct({
				code: Schema.String,
				message: Schema.String,
			}),
		),
	}),
}) as unknown as Schema.Codec<NetworksIdActionsAddSubnetPostOutput>;

// The operation
/**
 * Add a subnet to a Network
 *
 * Adds a new subnet to the [Network](#tag/networks).
 * If the subnet `ip_range` is not provided, the first available `/24` IP range will be used.
 * If a change is currently being performed on this [Network](#tag/networks), a error response with code `conflict` will be returned.
 *
 * @param id - ID of the Network.
 */
export const networksIdActionsAddSubnetPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksIdActionsAddSubnetPostInput,
	outputSchema: NetworksIdActionsAddSubnetPostOutput,
}));
