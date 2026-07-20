import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LocationsGetInput {
	name?: string;
	sort?: ReadonlyArray<"id" | "id:asc" | "id:desc" | "name" | "name:asc" | "name:desc">;
	page?: number;
	perPage?: number;
}
export const LocationsGetInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.optional(Schema.String),
	sort: Schema.optional(Schema.Array(Schema.Literals(["id", "id:asc", "id:desc", "name", "name:asc", "name:desc"]))),
	page: Schema.optional(Schema.Number),
	perPage: Schema.optional(Schema.Number),
}).pipe(T.Http({ method: "GET", path: "/locations" })) as unknown as Schema.Codec<LocationsGetInput>;

// Output Schema
export interface LocationsGetOutput {
	locations: ReadonlyArray<{
		id: number;
		name: string;
		description: string;
		country: string;
		city: string;
		latitude: number;
		longitude: number;
		network_zone: string;
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
export const LocationsGetOutput = /*@__PURE__*/ Schema.Struct({
	locations: Schema.Array(
		Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			description: Schema.String,
			country: Schema.String,
			city: Schema.String,
			latitude: Schema.Number,
			longitude: Schema.Number,
			network_zone: Schema.String,
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
}) as unknown as Schema.Codec<LocationsGetOutput>;

// The operation
/**
 * List Locations
 *
 * Returns all [Locations](#tag/locations).
 *
 * @param name - Filter resources by their name.

The response will only contain the resources
matching exactly the specified name.

 * @param sort - Sort resources by field and direction. May be used multiple times.

For more information, see "[Sorting](#description/sorting)".

 * @param page - Page number to return. For more information, see "[Pagination](#description/pagination)".
 * @param perPage - Maximum number of entries returned per page. For more information, see "[Pagination](#description/pagination)".
 */
export const locationsGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: LocationsGetInput,
	outputSchema: LocationsGetOutput,
}));
