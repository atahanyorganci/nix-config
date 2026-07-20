import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsDetachFromNetworkPostInput {
	id: number;
	network: number;
}
export const ServersIdActionsDetachFromNetworkPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	network: Schema.Number,
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/detach_from_network" }),
) as unknown as Schema.Codec<ServersIdActionsDetachFromNetworkPostInput>;

// Output Schema
export interface ServersIdActionsDetachFromNetworkPostOutput {
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
export const ServersIdActionsDetachFromNetworkPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsDetachFromNetworkPostOutput>;

// The operation
/**
 * Detach a Server from a Network
 *
 * Detaches a Server from a network. The interface for this network will vanish.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsDetachFromNetworkPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsDetachFromNetworkPostInput,
	outputSchema: ServersIdActionsDetachFromNetworkPostOutput,
}));
