import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancerTypesGetInput {
	name?: string;
	page?: number;
	perPage?: number;
}
export const LoadBalancerTypesGetInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.optional(Schema.String),
	page: Schema.optional(Schema.Number),
	perPage: Schema.optional(Schema.Number),
}).pipe(T.Http({ method: "GET", path: "/load_balancer_types" })) as unknown as Schema.Codec<LoadBalancerTypesGetInput>;

// Output Schema
export interface LoadBalancerTypesGetOutput {
	load_balancer_types: ReadonlyArray<{
		id: number;
		name: string;
		description: string;
		max_connections: number;
		max_services: number;
		max_targets: number;
		max_assigned_certificates: number;
		deprecated: string | null;
		deprecation: { unavailable_after: string; announced: string } | null;
		prices: ReadonlyArray<{
			location: string;
			price_hourly: { net: string; gross: string };
			price_monthly: { net: string; gross: string };
			included_traffic: number;
			price_per_tb_traffic: { net: string; gross: string };
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
export const LoadBalancerTypesGetOutput = /*@__PURE__*/ Schema.Struct({
	load_balancer_types: Schema.Array(
		Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			description: Schema.String,
			max_connections: Schema.Number,
			max_services: Schema.Number,
			max_targets: Schema.Number,
			max_assigned_certificates: Schema.Number,
			deprecated: Schema.NullOr(Schema.String),
			deprecation: Schema.NullOr(
				Schema.Struct({
					unavailable_after: Schema.String,
					announced: Schema.String,
				}),
			),
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
}) as unknown as Schema.Codec<LoadBalancerTypesGetOutput>;

// The operation
/**
 * List Load Balancer Types
 *
 * Gets all Load Balancer type objects.
 *
 * @param name - Filter resources by their name.

The response will only contain the resources
matching exactly the specified name.

 * @param page - Page number to return. For more information, see "[Pagination](#description/pagination)".
 * @param perPage - Maximum number of entries returned per page. For more information, see "[Pagination](#description/pagination)".
 */
export const loadBalancerTypesGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancerTypesGetInput,
	outputSchema: LoadBalancerTypesGetOutput,
}));
