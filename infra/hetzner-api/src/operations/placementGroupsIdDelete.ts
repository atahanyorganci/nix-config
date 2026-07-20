import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PlacementGroupsIdDeleteInput {
	id: number;
}
export const PlacementGroupsIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/placement_groups/{id}" }),
) as unknown as Schema.Codec<PlacementGroupsIdDeleteInput>;

// Output Schema
export type PlacementGroupsIdDeleteOutput = void;
export const PlacementGroupsIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<PlacementGroupsIdDeleteOutput>;

// The operation
/**
 * Delete a PlacementGroup
 *
 * Deletes a Placement Group.
 *
 * @param id - ID of the Placement Group.
 */
export const placementGroupsIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: PlacementGroupsIdDeleteInput,
	outputSchema: PlacementGroupsIdDeleteOutput,
}));
