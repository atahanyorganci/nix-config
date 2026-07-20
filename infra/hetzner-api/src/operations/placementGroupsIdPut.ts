import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PlacementGroupsIdPutInput {
	id: number;
	name?: string;
	labels?: Record<string, string>;
}
export const PlacementGroupsIdPutInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	name: Schema.optional(Schema.String),
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).pipe(
	T.Http({ method: "PUT", path: "/placement_groups/{id}" }),
) as unknown as Schema.Codec<PlacementGroupsIdPutInput>;

// Output Schema
export interface PlacementGroupsIdPutOutput {
	placement_group: {
		id: number;
		name: string;
		labels: Record<string, string>;
		type: "spread";
		created: string;
		servers: ReadonlyArray<number>;
	};
}
export const PlacementGroupsIdPutOutput = /*@__PURE__*/ Schema.Struct({
	placement_group: Schema.Struct({
		id: Schema.Number,
		name: Schema.String,
		labels: Schema.Record(Schema.String, Schema.String),
		type: Schema.Literals(["spread"]),
		created: Schema.String,
		servers: Schema.Array(Schema.Number),
	}),
}) as unknown as Schema.Codec<PlacementGroupsIdPutOutput>;

// The operation
/**
 * Update a PlacementGroup
 *
 * Updates the Placement Group properties.
 * Note: if the Placement Group object changes during the request, the response will be a “conflict” error.
 *
 * @param id - ID of the Placement Group.
 */
export const placementGroupsIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: PlacementGroupsIdPutInput,
	outputSchema: PlacementGroupsIdPutOutput,
}));
