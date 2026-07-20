import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancersIdActionsEnablePublicInterfacePostInput {
	id: number;
}
export const LoadBalancersIdActionsEnablePublicInterfacePostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/load_balancers/{id}/actions/enable_public_interface" }),
) as unknown as Schema.Codec<LoadBalancersIdActionsEnablePublicInterfacePostInput>;

// Output Schema
export interface LoadBalancersIdActionsEnablePublicInterfacePostOutput {
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
export const LoadBalancersIdActionsEnablePublicInterfacePostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<LoadBalancersIdActionsEnablePublicInterfacePostOutput>;

// The operation
/**
 * Enable the public interface of a Load Balancer
 *
 * Enable the public interface of a Load Balancer. The Load Balancer will be accessible from the internet via its public IPs.
 *
 * @param id - ID of the Load Balancer.
 */
export const loadBalancersIdActionsEnablePublicInterfacePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancersIdActionsEnablePublicInterfacePostInput,
	outputSchema: LoadBalancersIdActionsEnablePublicInterfacePostOutput,
}));
