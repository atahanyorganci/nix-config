import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsDisableBackupPostInput {
	id: number;
}
export const ServersIdActionsDisableBackupPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/disable_backup" }),
) as unknown as Schema.Codec<ServersIdActionsDisableBackupPostInput>;

// Output Schema
export interface ServersIdActionsDisableBackupPostOutput {
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
export const ServersIdActionsDisableBackupPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsDisableBackupPostOutput>;

// The operation
/**
 * Disable Backups for a Server
 *
 * Disables the automatic backup option and deletes all existing Backups for a Server. No more additional charges for backups will be made.
 * Caution: This immediately removes all existing backups for the Server!
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsDisableBackupPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsDisableBackupPostInput,
	outputSchema: ServersIdActionsDisableBackupPostOutput,
}));
