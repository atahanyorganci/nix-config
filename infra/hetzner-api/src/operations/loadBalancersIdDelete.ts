import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancersIdDeleteInput {
	id: number;
}
export const LoadBalancersIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/load_balancers/{id}" }),
) as unknown as Schema.Codec<LoadBalancersIdDeleteInput>;

// Output Schema
export type LoadBalancersIdDeleteOutput = void;
export const LoadBalancersIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<LoadBalancersIdDeleteOutput>;

// The operation
/**
 * Delete a Load Balancer
 *
 * Deletes a Load Balancer.
 *
 * @param id - ID of the Load Balancer.
 */
export const loadBalancersIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancersIdDeleteInput,
	outputSchema: LoadBalancersIdDeleteOutput,
}));
