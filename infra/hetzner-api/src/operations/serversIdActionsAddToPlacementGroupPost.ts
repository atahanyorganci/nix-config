import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsAddToPlacementGroupPostInput {
	id: number;
	placement_group: number;
}
export const ServersIdActionsAddToPlacementGroupPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	placement_group: Schema.Number,
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/add_to_placement_group" }),
) as unknown as Schema.Codec<ServersIdActionsAddToPlacementGroupPostInput>;

// Output Schema
export interface ServersIdActionsAddToPlacementGroupPostOutput {
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
export const ServersIdActionsAddToPlacementGroupPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsAddToPlacementGroupPostOutput>;

// The operation
/**
 * Add a Server to a Placement Group
 *
 * Adds a Server to a Placement Group.
 * Server must be powered off for this command to succeed.
 * #### Operation specific errors
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsAddToPlacementGroupPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsAddToPlacementGroupPostInput,
	outputSchema: ServersIdActionsAddToPlacementGroupPostOutput,
}));
