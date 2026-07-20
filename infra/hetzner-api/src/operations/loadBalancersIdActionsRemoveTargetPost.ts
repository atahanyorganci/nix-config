import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancersIdActionsRemoveTargetPostInput {
	id: number;
	type: "server" | "label_selector" | "ip";
	server?: { id: number; ip?: string };
	label_selector?: { selector: string };
	ip?: { ip: string };
}
export const LoadBalancersIdActionsRemoveTargetPostInput = /*@__PURE__*/ Schema.Struct({
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
}).pipe(
	T.Http({ method: "POST", path: "/load_balancers/{id}/actions/remove_target" }),
) as unknown as Schema.Codec<LoadBalancersIdActionsRemoveTargetPostInput>;

// Output Schema
export interface LoadBalancersIdActionsRemoveTargetPostOutput {
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
export const LoadBalancersIdActionsRemoveTargetPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<LoadBalancersIdActionsRemoveTargetPostOutput>;

// The operation
/**
 * Remove Target
 *
 * Removes a target from a Load Balancer.
 *
 * @param id - ID of the Load Balancer.
 */
export const loadBalancersIdActionsRemoveTargetPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancersIdActionsRemoveTargetPostInput,
	outputSchema: LoadBalancersIdActionsRemoveTargetPostOutput,
}));
