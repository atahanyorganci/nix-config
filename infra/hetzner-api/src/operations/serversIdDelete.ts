import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdDeleteInput {
	id: number;
}
export const ServersIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "DELETE", path: "/servers/{id}" })) as unknown as Schema.Codec<ServersIdDeleteInput>;

// Output Schema
export interface ServersIdDeleteOutput {
	action?: {
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
export const ServersIdDeleteOutput = /*@__PURE__*/ Schema.Struct({
	action: Schema.optional(
		Schema.Struct({
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
	),
}) as unknown as Schema.Codec<ServersIdDeleteOutput>;

// The operation
/**
 * Delete a Server
 *
 * Deletes a Server.
 * This immediately removes the Server from your account, and it is no longer
 * accessible. Any resources attached to the server (like Volumes, Primary IPs,
 * Floating IPs, Firewalls, Placement Groups) are detached while the server is deleted.
 *
 * @param id - ID of the Server.
 */
export const serversIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdDeleteInput,
	outputSchema: ServersIdDeleteOutput,
}));
