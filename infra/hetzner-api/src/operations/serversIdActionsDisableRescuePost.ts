import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsDisableRescuePostInput {
	id: number;
}
export const ServersIdActionsDisableRescuePostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/disable_rescue" }),
) as unknown as Schema.Codec<ServersIdActionsDisableRescuePostInput>;

// Output Schema
export interface ServersIdActionsDisableRescuePostOutput {
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
export const ServersIdActionsDisableRescuePostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsDisableRescuePostOutput>;

// The operation
/**
 * Disable Rescue Mode for a Server
 *
 * Disables the Hetzner Rescue System for a Server. This makes a Server start from its disks on next reboot.
 * Rescue Mode is automatically disabled when you first boot into it or if you do not use it for 60 minutes.
 * Disabling rescue mode will not reboot your Server — you will have to do this yourself.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsDisableRescuePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsDisableRescuePostInput,
	outputSchema: ServersIdActionsDisableRescuePostOutput,
}));
