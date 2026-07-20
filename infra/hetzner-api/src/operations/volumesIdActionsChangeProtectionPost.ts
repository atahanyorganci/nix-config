import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface VolumesIdActionsChangeProtectionPostInput {
	id: number;
	delete?: boolean;
}
export const VolumesIdActionsChangeProtectionPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	delete: Schema.optional(Schema.Boolean),
}).pipe(
	T.Http({ method: "POST", path: "/volumes/{id}/actions/change_protection" }),
) as unknown as Schema.Codec<VolumesIdActionsChangeProtectionPostInput>;

// Output Schema
export interface VolumesIdActionsChangeProtectionPostOutput {
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
export const VolumesIdActionsChangeProtectionPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<VolumesIdActionsChangeProtectionPostOutput>;

// The operation
/**
 * Change Volume Protection
 *
 * Changes the protection configuration of a Volume.
 *
 * @param id - ID of the Volume.
 */
export const volumesIdActionsChangeProtectionPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: VolumesIdActionsChangeProtectionPostInput,
	outputSchema: VolumesIdActionsChangeProtectionPostOutput,
}));
