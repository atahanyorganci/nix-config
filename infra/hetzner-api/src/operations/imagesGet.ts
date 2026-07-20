import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ImagesGetInput {
	sort?: ReadonlyArray<
		"id" | "id:asc" | "id:desc" | "name" | "name:asc" | "name:desc" | "created" | "created:asc" | "created:desc"
	>;
	type?: ReadonlyArray<"system" | "app" | "snapshot" | "backup">;
	status?: ReadonlyArray<"available" | "creating" | "unavailable">;
	boundTo?: ReadonlyArray<string>;
	includeDeprecated?: boolean;
	name?: string;
	labelSelector?: string;
	architecture?: "x86" | "arm";
	page?: number;
	perPage?: number;
}
export const ImagesGetInput = /*@__PURE__*/ Schema.Struct({
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
	type: Schema.optional(Schema.Array(Schema.Literals(["system", "app", "snapshot", "backup"]))),
	status: Schema.optional(Schema.Array(Schema.Literals(["available", "creating", "unavailable"]))),
	boundTo: Schema.optional(Schema.Array(Schema.String)),
	includeDeprecated: Schema.optional(Schema.Boolean),
	name: Schema.optional(Schema.String),
	labelSelector: Schema.optional(Schema.String),
	architecture: Schema.optional(Schema.Literals(["x86", "arm"])),
	page: Schema.optional(Schema.Number),
	perPage: Schema.optional(Schema.Number),
}).pipe(T.Http({ method: "GET", path: "/images" })) as unknown as Schema.Codec<ImagesGetInput>;

// Output Schema
export interface ImagesGetOutput {
	images: ReadonlyArray<{
		id: number;
		type: "system" | "app" | "snapshot" | "backup";
		status: "available" | "creating" | "unavailable";
		name: string | null;
		description: string;
		image_size: number | null;
		disk_size: number;
		created: string;
		created_from: { id: number; name: string } | null;
		bound_to: number | null;
		os_flavor: "ubuntu" | "centos" | "debian" | "fedora" | "rocky" | "alma" | "opensuse" | "unknown";
		os_version: string | null;
		rapid_deploy?: boolean;
		protection: { delete: boolean };
		deprecated: string | null;
		deleted: string | null;
		labels: Record<string, string>;
		architecture: "x86" | "arm";
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
export const ImagesGetOutput = /*@__PURE__*/ Schema.Struct({
	images: Schema.Array(
		Schema.Struct({
			id: Schema.Number,
			type: Schema.Literals(["system", "app", "snapshot", "backup"]),
			status: Schema.Literals(["available", "creating", "unavailable"]),
			name: Schema.NullOr(Schema.String),
			description: Schema.String,
			image_size: Schema.NullOr(Schema.Number),
			disk_size: Schema.Number,
			created: Schema.String,
			created_from: Schema.NullOr(
				Schema.Struct({
					id: Schema.Number,
					name: Schema.String,
				}),
			),
			bound_to: Schema.NullOr(Schema.Number),
			os_flavor: Schema.Literals(["ubuntu", "centos", "debian", "fedora", "rocky", "alma", "opensuse", "unknown"]),
			os_version: Schema.NullOr(Schema.String),
			rapid_deploy: Schema.optional(Schema.Boolean),
			protection: Schema.Struct({
				delete: Schema.Boolean,
			}),
			deprecated: Schema.NullOr(Schema.String),
			deleted: Schema.NullOr(Schema.String),
			labels: Schema.Record(Schema.String, Schema.String),
			architecture: Schema.Literals(["x86", "arm"]),
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
}) as unknown as Schema.Codec<ImagesGetOutput>;

// The operation
/**
 * List Images
 *
 * Returns all Image objects. You can select specific Image types only and sort the results by using URI parameters.
 *
 * @param sort - Sort resources by field and direction. May be used multiple times.

For more information, see "[Sorting](#description/sorting)".

 * @param type - Filter resources by type. May be used multiple times.

The response will only contain the resources with the specified type.

 * @param status - Filter resources by status. May be used multiple times.

The response will only contain the resources with the specified status.

 * @param boundTo - Filter Images by their linked Server ID. May be used multiple times.

Only available for Images of type `backup`.

 * @param includeDeprecated - Include deprecated Images.
 * @param name - Filter resources by their name.

The response will only contain the resources
matching exactly the specified name.

 * @param labelSelector - Filter resources by labels.

The response will only contain resources matching the label selector.
For more information, see "[Label Selector](#description/label-selector)".

 * @param architecture - Filter resources by cpu architecture.

The response will only contain the resources with the specified cpu architecture.

 * @param page - Page number to return. For more information, see "[Pagination](#description/pagination)".
 * @param perPage - Maximum number of entries returned per page. For more information, see "[Pagination](#description/pagination)".
 */
export const imagesGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ImagesGetInput,
	outputSchema: ImagesGetOutput,
}));
