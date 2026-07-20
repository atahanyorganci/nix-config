import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IsosGetInput {
	name?: string;
	architecture?: "x86" | "arm";
	includeArchitectureWildcard?: boolean;
	page?: number;
	perPage?: number;
}
export const IsosGetInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.optional(Schema.String),
	architecture: Schema.optional(Schema.Literals(["x86", "arm"])),
	includeArchitectureWildcard: Schema.optional(Schema.Boolean),
	page: Schema.optional(Schema.Number),
	perPage: Schema.optional(Schema.Number),
}).pipe(T.Http({ method: "GET", path: "/isos" })) as unknown as Schema.Codec<IsosGetInput>;

// Output Schema
export interface IsosGetOutput {
	isos: ReadonlyArray<{
		id: number;
		name: string | null;
		description: string;
		type: "public" | "private" | null;
		deprecation: { unavailable_after: string; announced: string } | null;
		architecture: "x86" | "arm" | null;
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
export const IsosGetOutput = /*@__PURE__*/ Schema.Struct({
	isos: Schema.Array(
		Schema.Struct({
			id: Schema.Number,
			name: Schema.NullOr(Schema.String),
			description: Schema.String,
			type: Schema.NullOr(Schema.Literals(["public", "private"])),
			deprecation: Schema.NullOr(
				Schema.Struct({
					unavailable_after: Schema.String,
					announced: Schema.String,
				}),
			),
			architecture: Schema.NullOr(Schema.Literals(["x86", "arm"])),
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
}) as unknown as Schema.Codec<IsosGetOutput>;

// The operation
/**
 * List ISOs
 *
 * Returns all available ISO objects.
 *
 * @param name - Filter resources by their name.

The response will only contain the resources
matching exactly the specified name.

 * @param architecture - Filter resources by cpu architecture.

The response will only contain the resources with the specified cpu architecture.

 * @param includeArchitectureWildcard - Include Images with wildcard architecture (architecture is null). Architecture filter must be specified.
 * @param page - Page number to return. For more information, see "[Pagination](#description/pagination)".
 * @param perPage - Maximum number of entries returned per page. For more information, see "[Pagination](#description/pagination)".
 */
export const isosGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IsosGetInput,
	outputSchema: IsosGetOutput,
}));
