import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancersIdActionsAttachToNetworkPostInput {
	id: number;
	network: number;
	ip?: string;
	ip_range?: string;
}
export const LoadBalancersIdActionsAttachToNetworkPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	network: Schema.Number,
	ip: Schema.optional(Schema.String),
	ip_range: Schema.optional(Schema.String),
}).pipe(
	T.Http({ method: "POST", path: "/load_balancers/{id}/actions/attach_to_network" }),
) as unknown as Schema.Codec<LoadBalancersIdActionsAttachToNetworkPostInput>;

// Output Schema
export interface LoadBalancersIdActionsAttachToNetworkPostOutput {
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
export const LoadBalancersIdActionsAttachToNetworkPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<LoadBalancersIdActionsAttachToNetworkPostOutput>;

// The operation
/**
 * Attach a Load Balancer to a Network
 *
 * Attach a Load Balancer to a Network.
 * #### Operation specific errors
 *
 * @param id - ID of the Load Balancer.
 */
export const loadBalancersIdActionsAttachToNetworkPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancersIdActionsAttachToNetworkPostInput,
	outputSchema: LoadBalancersIdActionsAttachToNetworkPostOutput,
}));
