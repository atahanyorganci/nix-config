import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface VolumesIdActionsResizePostInput {
	id: number;
	size: number;
}
export const VolumesIdActionsResizePostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	size: Schema.Number,
}).pipe(
	T.Http({ method: "POST", path: "/volumes/{id}/actions/resize" }),
) as unknown as Schema.Codec<VolumesIdActionsResizePostInput>;

// Output Schema
export interface VolumesIdActionsResizePostOutput {
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
export const VolumesIdActionsResizePostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<VolumesIdActionsResizePostOutput>;

// The operation
/**
 * Resize Volume
 *
 * Changes the size of a Volume. Note that downsizing a Volume is not possible.
 *
 * @param id - ID of the Volume.
 */
export const volumesIdActionsResizePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: VolumesIdActionsResizePostInput,
	outputSchema: VolumesIdActionsResizePostOutput,
}));
