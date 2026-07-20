import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsChangeTypePostInput {
	id: number;
	upgrade_disk: boolean;
	server_type: string;
}
export const ServersIdActionsChangeTypePostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	upgrade_disk: Schema.Boolean,
	server_type: Schema.String,
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/change_type" }),
) as unknown as Schema.Codec<ServersIdActionsChangeTypePostInput>;

// Output Schema
export interface ServersIdActionsChangeTypePostOutput {
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
export const ServersIdActionsChangeTypePostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsChangeTypePostOutput>;

// The operation
/**
 * Change the Type of a Server
 *
 * Changes the type (Cores, RAM and disk sizes) of a Server.
 * Server must be powered off for this command to succeed.
 * This copies the content of its disk, and starts it again.
 * You can only migrate to Server types with the same `storage_type` and equal or bigger disks. Shrinking disks is not possible as it might destroy data.
 * If the disk gets upgraded, the Server type can not be downgraded any more. If you plan to downgrade the Server type, set `upgrade_disk` to `false`.
 * #### Operation specific errors
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsChangeTypePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsChangeTypePostInput,
	outputSchema: ServersIdActionsChangeTypePostOutput,
}));
