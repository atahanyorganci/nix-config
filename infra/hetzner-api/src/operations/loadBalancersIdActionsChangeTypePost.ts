import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancersIdActionsChangeTypePostInput {
	id: number;
	load_balancer_type: string;
}
export const LoadBalancersIdActionsChangeTypePostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	load_balancer_type: Schema.String,
}).pipe(
	T.Http({ method: "POST", path: "/load_balancers/{id}/actions/change_type" }),
) as unknown as Schema.Codec<LoadBalancersIdActionsChangeTypePostInput>;

// Output Schema
export interface LoadBalancersIdActionsChangeTypePostOutput {
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
export const LoadBalancersIdActionsChangeTypePostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<LoadBalancersIdActionsChangeTypePostOutput>;

// The operation
/**
 * Change the Type of a Load Balancer
 *
 * Changes the type (Max Services, Max Targets and Max Connections) of a Load Balancer.
 * #### Operation specific errors
 *
 * @param id - ID of the Load Balancer.
 */
export const loadBalancersIdActionsChangeTypePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancersIdActionsChangeTypePostInput,
	outputSchema: LoadBalancersIdActionsChangeTypePostOutput,
}));
