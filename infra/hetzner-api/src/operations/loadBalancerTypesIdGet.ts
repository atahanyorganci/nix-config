import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancerTypesIdGetInput {
	id: number;
}
export const LoadBalancerTypesIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/load_balancer_types/{id}" }),
) as unknown as Schema.Codec<LoadBalancerTypesIdGetInput>;

// Output Schema
export interface LoadBalancerTypesIdGetOutput {
	load_balancer_type: {
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
	};
}
export const LoadBalancerTypesIdGetOutput = /*@__PURE__*/ Schema.Struct({
	load_balancer_type: Schema.Struct({
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
}) as unknown as Schema.Codec<LoadBalancerTypesIdGetOutput>;

// The operation
/**
 * Get a Load Balancer Type
 *
 * Gets a specific Load Balancer type object.
 *
 * @param id - ID of the Load Balancer Type.
 */
export const loadBalancerTypesIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancerTypesIdGetInput,
	outputSchema: LoadBalancerTypesIdGetOutput,
}));
