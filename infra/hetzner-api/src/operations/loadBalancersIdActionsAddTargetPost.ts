import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancersIdActionsAddTargetPostInput {
	id: number;
	type: "server" | "label_selector" | "ip";
	server?: { id: number; ip?: string };
	label_selector?: { selector: string };
	ip?: { ip: string };
	use_private_ip?: boolean;
}
export const LoadBalancersIdActionsAddTargetPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	type: Schema.Literals(["server", "label_selector", "ip"]),
	server: Schema.optional(
		Schema.Struct({
			id: Schema.Number,
			ip: Schema.optional(Schema.String),
		}),
	),
	label_selector: Schema.optional(
		Schema.Struct({
			selector: Schema.String,
		}),
	),
	ip: Schema.optional(
		Schema.Struct({
			ip: Schema.String,
		}),
	),
	use_private_ip: Schema.optional(Schema.Boolean),
}).pipe(
	T.Http({ method: "POST", path: "/load_balancers/{id}/actions/add_target" }),
) as unknown as Schema.Codec<LoadBalancersIdActionsAddTargetPostInput>;

// Output Schema
export interface LoadBalancersIdActionsAddTargetPostOutput {
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
export const LoadBalancersIdActionsAddTargetPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<LoadBalancersIdActionsAddTargetPostOutput>;

// The operation
/**
 * Add Target
 *
 * Adds a target to a Load Balancer.
 * #### Operation specific errors
 *
 * @param id - ID of the Load Balancer.
 */
export const loadBalancersIdActionsAddTargetPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancersIdActionsAddTargetPostInput,
	outputSchema: LoadBalancersIdActionsAddTargetPostOutput,
}));
