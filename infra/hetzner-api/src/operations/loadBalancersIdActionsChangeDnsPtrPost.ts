import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface LoadBalancersIdActionsChangeDnsPtrPostInput {
	id: number;
	ip: string;
	dns_ptr?: string | null;
}
export const LoadBalancersIdActionsChangeDnsPtrPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	ip: Schema.String,
	dns_ptr: Schema.optional(Schema.NullOr(Schema.String)),
}).pipe(
	T.Http({ method: "POST", path: "/load_balancers/{id}/actions/change_dns_ptr" }),
) as unknown as Schema.Codec<LoadBalancersIdActionsChangeDnsPtrPostInput>;

// Output Schema
export interface LoadBalancersIdActionsChangeDnsPtrPostOutput {
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
export const LoadBalancersIdActionsChangeDnsPtrPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<LoadBalancersIdActionsChangeDnsPtrPostOutput>;

// The operation
/**
 * Change reverse DNS entry for this Load Balancer
 *
 * Changes the hostname that will appear when getting the hostname belonging to the public IPs (IPv4 and IPv6) of this Load Balancer.
 * Floating IPs assigned to the Server are not affected by this.
 *
 * @param id - ID of the Load Balancer.
 */
export const loadBalancersIdActionsChangeDnsPtrPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: LoadBalancersIdActionsChangeDnsPtrPostInput,
	outputSchema: LoadBalancersIdActionsChangeDnsPtrPostOutput,
}));
