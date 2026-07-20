import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServerTypesIdGetInput {
	id: number;
}
export const ServerTypesIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "GET", path: "/server_types/{id}" })) as unknown as Schema.Codec<ServerTypesIdGetInput>;

// Output Schema
export interface ServerTypesIdGetOutput {
	server_type: {
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
	};
}
export const ServerTypesIdGetOutput = /*@__PURE__*/ Schema.Struct({
	server_type: Schema.Struct({
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
}) as unknown as Schema.Codec<ServerTypesIdGetOutput>;

// The operation
/**
 * Get a Server Type
 *
 * Gets a specific Server type object.
 *
 * @param id - ID of the Server Type.
 */
export const serverTypesIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServerTypesIdGetInput,
	outputSchema: ServerTypesIdGetOutput,
}));
