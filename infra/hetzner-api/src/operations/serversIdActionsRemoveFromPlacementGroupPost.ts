import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsRemoveFromPlacementGroupPostInput {
	id: number;
}
export const ServersIdActionsRemoveFromPlacementGroupPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/remove_from_placement_group" }),
) as unknown as Schema.Codec<ServersIdActionsRemoveFromPlacementGroupPostInput>;

// Output Schema
export interface ServersIdActionsRemoveFromPlacementGroupPostOutput {
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
export const ServersIdActionsRemoveFromPlacementGroupPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsRemoveFromPlacementGroupPostOutput>;

// The operation
/**
 * Remove from Placement Group
 *
 * Removes a Server from a Placement Group.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsRemoveFromPlacementGroupPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsRemoveFromPlacementGroupPostInput,
	outputSchema: ServersIdActionsRemoveFromPlacementGroupPostOutput,
}));
