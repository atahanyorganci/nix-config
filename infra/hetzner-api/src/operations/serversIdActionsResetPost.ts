import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsResetPostInput {
	id: number;
}
export const ServersIdActionsResetPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/reset" }),
) as unknown as Schema.Codec<ServersIdActionsResetPostInput>;

// Output Schema
export interface ServersIdActionsResetPostOutput {
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
export const ServersIdActionsResetPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsResetPostOutput>;

// The operation
/**
 * Reset a Server
 *
 * Cuts power to a Server and starts it again. This forcefully stops it without giving the Server operating system time to gracefully stop. This may lead to data loss, it’s equivalent to pulling the power cord and plugging it in again. Reset should only be used when reboot does not work.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsResetPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsResetPostInput,
	outputSchema: ServersIdActionsResetPostOutput,
}));
