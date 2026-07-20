import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancersIdActionsDeleteServicePostInput {
	id: number;
	listen_port: number;
}
export const LoadBalancersIdActionsDeleteServicePostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	listen_port: Schema.Number,
}).pipe(
	T.Http({ method: "POST", path: "/load_balancers/{id}/actions/delete_service" }),
) as unknown as Schema.Codec<LoadBalancersIdActionsDeleteServicePostInput>;

// Output Schema
export interface LoadBalancersIdActionsDeleteServicePostOutput {
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
export const LoadBalancersIdActionsDeleteServicePostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<LoadBalancersIdActionsDeleteServicePostOutput>;

// The operation
/**
 * Delete Service
 *
 * Delete a service of a Load Balancer.
 *
 * @param id - ID of the Load Balancer.
 */
export const loadBalancersIdActionsDeleteServicePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancersIdActionsDeleteServicePostInput,
	outputSchema: LoadBalancersIdActionsDeleteServicePostOutput,
}));
