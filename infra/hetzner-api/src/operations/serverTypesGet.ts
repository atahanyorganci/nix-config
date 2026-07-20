import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServerTypesGetInput {
	name?: string;
	page?: number;
	perPage?: number;
}
export const ServerTypesGetInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.optional(Schema.String),
	page: Schema.optional(Schema.Number),
	perPage: Schema.optional(Schema.Number),
}).pipe(T.Http({ method: "GET", path: "/server_types" })) as unknown as Schema.Codec<ServerTypesGetInput>;

// Output Schema
export interface ServerTypesGetOutput {
	server_types: ReadonlyArray<{
		id: number;
		name: string;
		description: string;
		cores: number;
		memory: number;
		disk: number;
		deprecated: boolean;
		prices: ReadonlyArray<{
			location: string;
			price_hourly: { net: string; gross: string };
			price_monthly: { net: string; gross: string };
			included_traffic: number;
			price_per_tb_traffic: { net: string; gross: string };
		}>;
		storage_type: "local" | "network";
		cpu_type: "shared" | "dedicated";
		category?: string;
		architecture: "x86" | "arm";
		deprecation?: { unavailable_after: string; announced: string } | null;
		locations: ReadonlyArray<{
			id: number;
			name: string;
			deprecation: { unavailable_after: string; announced: string } | null;
			recommended: boolean;
			available: boolean;
		}>;
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
export const ServerTypesGetOutput = /*@__PURE__*/ Schema.Struct({
	server_types: Schema.Array(
		Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			description: Schema.String,
			cores: Schema.Number,
			memory: Schema.Number,
			disk: Schema.Number,
			deprecated: Schema.Boolean,
			prices: Schema.Array(
				Schema.Struct({
					location: Schema.String,
					price_hourly: Schema.Struct({
						net: Schema.String,
						gross: Schema.String,
					}),
					price_monthly: Schema.Struct({
						net: Schema.String,
						gross: Schema.String,
					}),
					included_traffic: Schema.Number,
					price_per_tb_traffic: Schema.Struct({
						net: Schema.String,
						gross: Schema.String,
					}),
				}),
			),
			storage_type: Schema.Literals(["local", "network"]),
			cpu_type: Schema.Literals(["shared", "dedicated"]),
			category: Schema.optional(Schema.String),
			architecture: Schema.Literals(["x86", "arm"]),
			deprecation: Schema.optional(
				Schema.NullOr(
					Schema.Struct({
						unavailable_after: Schema.String,
						announced: Schema.String,
					}),
				),
			),
			locations: Schema.Array(
				Schema.Struct({
					id: Schema.Number,
					name: Schema.String,
					deprecation: Schema.NullOr(
						Schema.Struct({
							unavailable_after: Schema.String,
							announced: Schema.String,
						}),
					),
					recommended: Schema.Boolean,
					available: Schema.Boolean,
				}),
			),
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
}) as unknown as Schema.Codec<ServerTypesGetOutput>;

// The operation
/**
 * List Server Types
 *
 * Gets all Server type objects.
 *
 * @param name - Filter resources by their name.

The response will only contain the resources
matching exactly the specified name.

 * @param page - Page number to return. For more information, see "[Pagination](#description/pagination)".
 * @param perPage - Maximum number of entries returned per page. For more information, see "[Pagination](#description/pagination)".
 */
export const serverTypesGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServerTypesGetInput,
	outputSchema: ServerTypesGetOutput,
}));
