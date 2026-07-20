import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ImagesIdActionsChangeProtectionPostInput {
	id: number;
	delete?: boolean;
}
export const ImagesIdActionsChangeProtectionPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	delete: Schema.optional(Schema.Boolean),
}).pipe(
	T.Http({ method: "POST", path: "/images/{id}/actions/change_protection" }),
) as unknown as Schema.Codec<ImagesIdActionsChangeProtectionPostInput>;

// Output Schema
export interface ImagesIdActionsChangeProtectionPostOutput {
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
export const ImagesIdActionsChangeProtectionPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ImagesIdActionsChangeProtectionPostOutput>;

// The operation
/**
 * Change Image Protection
 *
 * Changes the protection configuration of the Image. Can only be used on snapshots.
 *
 * @param id - ID of the Image.
 */
export const imagesIdActionsChangeProtectionPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ImagesIdActionsChangeProtectionPostInput,
	outputSchema: ImagesIdActionsChangeProtectionPostOutput,
}));
