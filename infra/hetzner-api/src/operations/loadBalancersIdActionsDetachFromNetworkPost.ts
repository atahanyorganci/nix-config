import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancersIdActionsDetachFromNetworkPostInput {
	id: number;
	network: number;
}
export const LoadBalancersIdActionsDetachFromNetworkPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	network: Schema.Number,
}).pipe(
	T.Http({ method: "POST", path: "/load_balancers/{id}/actions/detach_from_network" }),
) as unknown as Schema.Codec<LoadBalancersIdActionsDetachFromNetworkPostInput>;

// Output Schema
export interface LoadBalancersIdActionsDetachFromNetworkPostOutput {
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
export const LoadBalancersIdActionsDetachFromNetworkPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<LoadBalancersIdActionsDetachFromNetworkPostOutput>;

// The operation
/**
 * Detach a Load Balancer from a Network
 *
 * Detaches a Load Balancer from a network.
 *
 * @param id - ID of the Load Balancer.
 */
export const loadBalancersIdActionsDetachFromNetworkPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancersIdActionsDetachFromNetworkPostInput,
	outputSchema: LoadBalancersIdActionsDetachFromNetworkPostOutput,
}));
