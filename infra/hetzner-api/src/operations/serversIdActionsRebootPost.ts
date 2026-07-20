import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsRebootPostInput {
	id: number;
}
export const ServersIdActionsRebootPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/reboot" }),
) as unknown as Schema.Codec<ServersIdActionsRebootPostInput>;

// Output Schema
export interface ServersIdActionsRebootPostOutput {
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
export const ServersIdActionsRebootPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsRebootPostOutput>;

// The operation
/**
 * Soft-reboot a Server
 *
 * Reboots a Server gracefully by sending an ACPI request. The Server operating system must support ACPI and react to the request, otherwise the Server will not reboot.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsRebootPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsRebootPostInput,
	outputSchema: ServersIdActionsRebootPostOutput,
}));
