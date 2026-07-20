import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancersIdActionsChangeAlgorithmPostInput {
	id: number;
	type: "round_robin" | "least_connections";
}
export const LoadBalancersIdActionsChangeAlgorithmPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	type: Schema.Literals(["round_robin", "least_connections"]),
}).pipe(
	T.Http({ method: "POST", path: "/load_balancers/{id}/actions/change_algorithm" }),
) as unknown as Schema.Codec<LoadBalancersIdActionsChangeAlgorithmPostInput>;

// Output Schema
export interface LoadBalancersIdActionsChangeAlgorithmPostOutput {
	action: {
		id: number;
		command: string;
		status: "running" | "success" | "error";
		started: string;
		finished: string | null;
		progress: number;
		resources: ReadonlyArray<{ id: number; type: string }>;
		error: { code: string; message: string } | null;
	};
}
export const LoadBalancersIdActionsChangeAlgorithmPostOutput = /*@__PURE__*/ Schema.Struct({
	action: Schema.Struct({
		id: Schema.Number,
		command: Schema.String,
		status: Schema.Literals(["running", "success", "error"]),
		started: Schema.String,
		finished: Schema.NullOr(Schema.String),
		progress: Schema.Number,
		resources: Schema.Array(
			Schema.Struct({
				id: Schema.Number,
				type: Schema.String,
			}),
		),
		error: Schema.NullOr(
			Schema.Struct({
				code: Schema.String,
				message: Schema.String,
			}),
		),
	}),
}) as unknown as Schema.Codec<LoadBalancersIdActionsChangeAlgorithmPostOutput>;

// The operation
/**
 * Change Algorithm
 *
 * Change the algorithm that determines to which target new requests are sent.
 *
 * @param id - ID of the Load Balancer.
 */
export const loadBalancersIdActionsChangeAlgorithmPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancersIdActionsChangeAlgorithmPostInput,
	outputSchema: LoadBalancersIdActionsChangeAlgorithmPostOutput,
}));
