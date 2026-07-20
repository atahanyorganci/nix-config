import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PlacementGroupsIdGetInput {
	id: number;
}
export const PlacementGroupsIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/placement_groups/{id}" }),
) as unknown as Schema.Codec<PlacementGroupsIdGetInput>;

// Output Schema
export interface PlacementGroupsIdGetOutput {
	placement_group: {
		id: number;
		name: string;
		labels: Record<string, string>;
		type: "spread";
		created: string;
		servers: ReadonlyArray<number>;
	};
}
export const PlacementGroupsIdGetOutput = /*@__PURE__*/ Schema.Struct({
	placement_group: Schema.Struct({
		id: Schema.Number,
		name: Schema.String,
		labels: Schema.Record(Schema.String, Schema.String),
		type: Schema.Literals(["spread"]),
		created: Schema.String,
		servers: Schema.Array(Schema.Number),
	}),
}) as unknown as Schema.Codec<PlacementGroupsIdGetOutput>;

// The operation
/**
 * Get a PlacementGroup
 *
 * Gets a specific Placement Group object.
 *
 * @param id - ID of the Placement Group.
 */
export const placementGroupsIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: PlacementGroupsIdGetInput,
	outputSchema: PlacementGroupsIdGetOutput,
}));
