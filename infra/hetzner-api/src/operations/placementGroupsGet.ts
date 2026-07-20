import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PlacementGroupsGetInput {
	sort?: ReadonlyArray<
		"id" | "id:asc" | "id:desc" | "name" | "name:asc" | "name:desc" | "created" | "created:asc" | "created:desc"
	>;
	name?: string;
	labelSelector?: string;
	type?: ReadonlyArray<"spread">;
	page?: number;
	perPage?: number;
}
export const PlacementGroupsGetInput = /*@__PURE__*/ Schema.Struct({
	sort: Schema.optional(
		Schema.Array(
			Schema.Literals([
				"id",
				"id:asc",
				"id:desc",
				"name",
				"name:asc",
				"name:desc",
				"created",
				"created:asc",
				"created:desc",
			]),
		),
	),
	name: Schema.optional(Schema.String),
	labelSelector: Schema.optional(Schema.String),
	type: Schema.optional(Schema.Array(Schema.Literals(["spread"]))),
	page: Schema.optional(Schema.Number),
	perPage: Schema.optional(Schema.Number),
}).pipe(T.Http({ method: "GET", path: "/placement_groups" })) as unknown as Schema.Codec<PlacementGroupsGetInput>;

// Output Schema
export interface PlacementGroupsGetOutput {
	placement_groups: ReadonlyArray<{
		id: number;
		name: string;
		labels: Record<string, string>;
		type: "spread";
		created: string;
		servers: ReadonlyArray<number>;
	}>;
	meta: {
		pagination: {
			page: number;
			per_page: number;
			previous_page: number | null;
			next_page: number | null;
			last_page: number | null;
			total_entries: number | null;
		};
	};
}
export const PlacementGroupsGetOutput = /*@__PURE__*/ Schema.Struct({
	placement_groups: Schema.Array(
		Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			labels: Schema.Record(Schema.String, Schema.String),
			type: Schema.Literals(["spread"]),
			created: Schema.String,
			servers: Schema.Array(Schema.Number),
		}),
	),
	meta: Schema.Struct({
		pagination: Schema.Struct({
			page: Schema.Number,
			per_page: Schema.Number,
			previous_page: Schema.NullOr(Schema.Number),
			next_page: Schema.NullOr(Schema.Number),
			last_page: Schema.NullOr(Schema.Number),
			total_entries: Schema.NullOr(Schema.Number),
		}),
	}),
}) as unknown as Schema.Codec<PlacementGroupsGetOutput>;

// The operation
/**
 * List Placement Groups
 *
 * Returns all Placement Group objects.
 *
 * @param sort - Sort resources by field and direction. May be used multiple times.

For more information, see "[Sorting](#description/sorting)".

 * @param name - Filter resources by their name.

The response will only contain the resources
matching exactly the specified name.

 * @param labelSelector - Filter resources by labels.

The response will only contain resources matching the label selector.
For more information, see "[Label Selector](#description/label-selector)".

 * @param type - Filter resources by type. May be used multiple times.

The response will only contain the resources with the specified type.

 * @param page - Page number to return. For more information, see "[Pagination](#description/pagination)".
 * @param perPage - Maximum number of entries returned per page. For more information, see "[Pagination](#description/pagination)".
 */
export const placementGroupsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: PlacementGroupsGetInput,
	outputSchema: PlacementGroupsGetOutput,
}));
