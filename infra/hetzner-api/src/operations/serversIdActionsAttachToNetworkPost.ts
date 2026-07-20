import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsAttachToNetworkPostInput {
	id: number;
	network: number;
	ip?: string;
	alias_ips?: ReadonlyArray<string>;
	ip_range?: string;
}
export const ServersIdActionsAttachToNetworkPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	network: Schema.Number,
	ip: Schema.optional(Schema.String),
	alias_ips: Schema.optional(Schema.Array(Schema.String)),
	ip_range: Schema.optional(Schema.String),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/attach_to_network" }),
) as unknown as Schema.Codec<ServersIdActionsAttachToNetworkPostInput>;

// Output Schema
export interface ServersIdActionsAttachToNetworkPostOutput {
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
export const ServersIdActionsAttachToNetworkPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsAttachToNetworkPostOutput>;

// The operation
/**
 * Attach a Server to a Network
 *
 * Attaches a Server to a network. This will complement the fixed public Server interface by adding an additional ethernet interface to the Server which is connected to the specified network.
 * The Server will get an IP auto assigned from a subnet of type `server` in the same `network_zone`.
 * Using the `alias_ips` attribute you can also define one or more additional IPs to the Servers. Please note that you will have to configure these IPs by hand on your Server since only the primary IP will be given out by DHCP.
 * #### Operation specific errors
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsAttachToNetworkPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsAttachToNetworkPostInput,
	outputSchema: ServersIdActionsAttachToNetworkPostOutput,
}));
