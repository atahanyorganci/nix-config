import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface VolumesGetInput {
	status?: ReadonlyArray<"available" | "creating">;
	sort?: ReadonlyArray<
		"id" | "id:asc" | "id:desc" | "name" | "name:asc" | "name:desc" | "created" | "created:asc" | "created:desc"
	>;
	name?: string;
	labelSelector?: string;
	page?: number;
	perPage?: number;
}
export const VolumesGetInput = /*@__PURE__*/ Schema.Struct({
	status: Schema.optional(Schema.Array(Schema.Literals(["available", "creating"]))),
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
	page: Schema.optional(Schema.Number),
	perPage: Schema.optional(Schema.Number),
}).pipe(T.Http({ method: "GET", path: "/volumes" })) as unknown as Schema.Codec<VolumesGetInput>;

// Output Schema
export interface VolumesGetOutput {
	volumes: ReadonlyArray<{
		id: number;
		created: string;
		name: string;
		server: number | null;
		location: {
			id: number;
			name: string;
			description: string;
			country: string;
			city: string;
			latitude: number;
			longitude: number;
			network_zone: string;
		};
		size: number;
		linux_device: string;
		protection: { delete: boolean };
		labels: Record<string, string>;
		status: "available" | "creating";
		format: string | null;
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
export const VolumesGetOutput = /*@__PURE__*/ Schema.Struct({
	volumes: Schema.Array(
		Schema.Struct({
			id: Schema.Number,
			created: Schema.String,
			name: Schema.String,
			server: Schema.NullOr(Schema.Number),
			location: Schema.Struct({
				id: Schema.Number,
				name: Schema.String,
				description: Schema.String,
				country: Schema.String,
				city: Schema.String,
				latitude: Schema.Number,
				longitude: Schema.Number,
				network_zone: Schema.String,
			}),
			size: Schema.Number,
			linux_device: Schema.String,
			protection: Schema.Struct({
				delete: Schema.Boolean,
			}),
			labels: Schema.Record(Schema.String, Schema.String),
			status: Schema.Literals(["available", "creating"]),
			format: Schema.NullOr(Schema.String),
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
}) as unknown as Schema.Codec<VolumesGetOutput>;

// The operation
/**
 * List Volumes
 *
 * Gets all existing Volumes that you have available.
 *
 * @param status - Filter resources by status. May be used multiple times.

The response will only contain the resources with the specified status.

 * @param sort - Sort resources by field and direction. May be used multiple times.

For more information, see "[Sorting](#description/sorting)".

 * @param name - Filter resources by their name.

The response will only contain the resources
matching exactly the specified name.

 * @param labelSelector - Filter resources by labels.

The response will only contain resources matching the label selector.
For more information, see "[Label Selector](#description/label-selector)".

 * @param page - Page number to return. For more information, see "[Pagination](#description/pagination)".
 * @param perPage - Maximum number of entries returned per page. For more information, see "[Pagination](#description/pagination)".
 */
export const volumesGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: VolumesGetInput,
	outputSchema: VolumesGetOutput,
}));
