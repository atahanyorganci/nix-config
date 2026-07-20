import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancersIdActionsDisablePublicInterfacePostInput {
	id: number;
}
export const LoadBalancersIdActionsDisablePublicInterfacePostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/load_balancers/{id}/actions/disable_public_interface" }),
) as unknown as Schema.Codec<LoadBalancersIdActionsDisablePublicInterfacePostInput>;

// Output Schema
export interface LoadBalancersIdActionsDisablePublicInterfacePostOutput {
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
export const LoadBalancersIdActionsDisablePublicInterfacePostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<LoadBalancersIdActionsDisablePublicInterfacePostOutput>;

// The operation
/**
 * Disable the public interface of a Load Balancer
 *
 * Disable the public interface of a Load Balancer. The Load Balancer will be not accessible from the internet via its public IPs.
 * #### Operation specific errors
 *
 * @param id - ID of the Load Balancer.
 */
export const loadBalancersIdActionsDisablePublicInterfacePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancersIdActionsDisablePublicInterfacePostInput,
	outputSchema: LoadBalancersIdActionsDisablePublicInterfacePostOutput,
}));
