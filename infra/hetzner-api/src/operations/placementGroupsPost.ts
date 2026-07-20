import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PlacementGroupsPostInput {
	name: string;
	labels?: Record<string, string>;
	type: "spread";
}
export const PlacementGroupsPostInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
	type: Schema.Literals(["spread"]),
}).pipe(T.Http({ method: "POST", path: "/placement_groups" })) as unknown as Schema.Codec<PlacementGroupsPostInput>;

// Output Schema
export interface PlacementGroupsPostOutput {
	placement_group: {
		id: number;
		name: string;
		labels: Record<string, string>;
		type: "spread";
		created: string;
		servers: ReadonlyArray<number>;
	};
	action?: {
		id: number;
		command: string;
		status: "running" | "success" | "error";
		started: string;
		finished: string | null;
		progress: number;
		resources: ReadonlyArray<{ id: number; type: string }>;
		error: { code: string; message: string } | null;
	} | null;
}
export const PlacementGroupsPostOutput = /*@__PURE__*/ Schema.Struct({
	placement_group: Schema.Struct({
		id: Schema.Number,
		name: Schema.String,
		labels: Schema.Record(Schema.String, Schema.String),
		type: Schema.Literals(["spread"]),
		created: Schema.String,
		servers: Schema.Array(Schema.Number),
	}),
	action: Schema.optional(
		Schema.NullOr(
			Schema.Struct({
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
		),
	),
}) as unknown as Schema.Codec<PlacementGroupsPostOutput>;

// The operation
/**
 * Create a PlacementGroup
 *
 * Creates a new Placement Group.
 */
export const placementGroupsPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: PlacementGroupsPostInput,
	outputSchema: PlacementGroupsPostOutput,
}));
