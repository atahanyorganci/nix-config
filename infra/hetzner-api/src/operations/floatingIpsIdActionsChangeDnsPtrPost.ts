import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FloatingIpsIdActionsChangeDnsPtrPostInput {
	id: number;
	ip: string;
	dns_ptr?: string | null;
}
export const FloatingIpsIdActionsChangeDnsPtrPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	ip: Schema.String,
	dns_ptr: Schema.optional(Schema.NullOr(Schema.String)),
}).pipe(
	T.Http({ method: "POST", path: "/floating_ips/{id}/actions/change_dns_ptr" }),
) as unknown as Schema.Codec<FloatingIpsIdActionsChangeDnsPtrPostInput>;

// Output Schema
export interface FloatingIpsIdActionsChangeDnsPtrPostOutput {
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
export const FloatingIpsIdActionsChangeDnsPtrPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<FloatingIpsIdActionsChangeDnsPtrPostOutput>;

// The operation
/**
 * Change reverse DNS records for a Floating IP
 *
 * Change the reverse DNS records for this [Floating IP](#tag/floating-ips).
 * Allows to modify the PTR records set for the IP address.
 *
 * @param id - ID of the Floating IP.
 */
export const floatingIpsIdActionsChangeDnsPtrPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: FloatingIpsIdActionsChangeDnsPtrPostInput,
	outputSchema: FloatingIpsIdActionsChangeDnsPtrPostOutput,
}));
