import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancersIdActionsChangeProtectionPostInput {
	id: number;
	delete?: boolean;
}
export const LoadBalancersIdActionsChangeProtectionPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	delete: Schema.optional(Schema.Boolean),
}).pipe(
	T.Http({ method: "POST", path: "/load_balancers/{id}/actions/change_protection" }),
) as unknown as Schema.Codec<LoadBalancersIdActionsChangeProtectionPostInput>;

// Output Schema
export interface LoadBalancersIdActionsChangeProtectionPostOutput {
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
export const LoadBalancersIdActionsChangeProtectionPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<LoadBalancersIdActionsChangeProtectionPostOutput>;

// The operation
/**
 * Change Load Balancer Protection
 *
 * Changes the protection configuration of a Load Balancer.
 *
 * @param id - ID of the Load Balancer.
 */
export const loadBalancersIdActionsChangeProtectionPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancersIdActionsChangeProtectionPostInput,
	outputSchema: LoadBalancersIdActionsChangeProtectionPostOutput,
}));
