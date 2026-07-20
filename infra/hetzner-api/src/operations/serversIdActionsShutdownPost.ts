import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsShutdownPostInput {
	id: number;
}
export const ServersIdActionsShutdownPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/shutdown" }),
) as unknown as Schema.Codec<ServersIdActionsShutdownPostInput>;

// Output Schema
export interface ServersIdActionsShutdownPostOutput {
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
export const ServersIdActionsShutdownPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsShutdownPostOutput>;

// The operation
/**
 * Shutdown a Server
 *
 * Shuts down a Server gracefully by sending an ACPI shutdown request. The Server operating system must support ACPI
 * and react to the request, otherwise the Server will not shut down. Please note that the `action` status in this case
 * only reflects whether the action was sent to the server. It does not mean that the server actually shut down
 * successfully. If you need to ensure that the server is off, use the `poweroff` action.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsShutdownPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsShutdownPostInput,
	outputSchema: ServersIdActionsShutdownPostOutput,
}));
