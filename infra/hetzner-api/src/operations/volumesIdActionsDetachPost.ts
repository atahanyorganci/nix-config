import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface VolumesIdActionsDetachPostInput {
	id: number;
}
export const VolumesIdActionsDetachPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/volumes/{id}/actions/detach" }),
) as unknown as Schema.Codec<VolumesIdActionsDetachPostInput>;

// Output Schema
export interface VolumesIdActionsDetachPostOutput {
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
export const VolumesIdActionsDetachPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<VolumesIdActionsDetachPostOutput>;

// The operation
/**
 * Detach Volume
 *
 * Detaches a Volume from the Server it’s attached to. You may attach it to a Server again at a later time.
 *
 * @param id - ID of the Volume.
 */
export const volumesIdActionsDetachPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: VolumesIdActionsDetachPostInput,
	outputSchema: VolumesIdActionsDetachPostOutput,
}));
