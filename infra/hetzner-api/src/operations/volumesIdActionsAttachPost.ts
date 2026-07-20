import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface VolumesIdActionsAttachPostInput {
	id: number;
	server: number;
	automount?: boolean;
}
export const VolumesIdActionsAttachPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	server: Schema.Number,
	automount: Schema.optional(Schema.Boolean),
}).pipe(
	T.Http({ method: "POST", path: "/volumes/{id}/actions/attach" }),
) as unknown as Schema.Codec<VolumesIdActionsAttachPostInput>;

// Output Schema
export interface VolumesIdActionsAttachPostOutput {
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
export const VolumesIdActionsAttachPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<VolumesIdActionsAttachPostOutput>;

// The operation
/**
 * Attach Volume to a Server
 *
 * Attaches a Volume to a Server. Works only if the Server is in the same Location as the Volume.
 *
 * @param id - ID of the Volume.
 */
export const volumesIdActionsAttachPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: VolumesIdActionsAttachPostInput,
	outputSchema: VolumesIdActionsAttachPostOutput,
}));
