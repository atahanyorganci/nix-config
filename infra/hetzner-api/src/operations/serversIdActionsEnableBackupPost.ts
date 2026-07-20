import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsEnableBackupPostInput {
	id: number;
}
export const ServersIdActionsEnableBackupPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/enable_backup" }),
) as unknown as Schema.Codec<ServersIdActionsEnableBackupPostInput>;

// Output Schema
export interface ServersIdActionsEnableBackupPostOutput {
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
export const ServersIdActionsEnableBackupPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsEnableBackupPostOutput>;

// The operation
/**
 * Enable and Configure Backups for a Server
 *
 * Enables and configures the automatic daily backup option for the Server. Enabling automatic backups will increase the price of the Server by 20%. In return, you will get seven slots where Images of type backup can be stored.
 * Backups are automatically created daily.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsEnableBackupPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsEnableBackupPostInput,
	outputSchema: ServersIdActionsEnableBackupPostOutput,
}));
