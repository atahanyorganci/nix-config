import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PrimaryIpsIdActionsChangeDnsPtrPostInput {
	id: number;
	ip: string;
	dns_ptr?: string | null;
}
export const PrimaryIpsIdActionsChangeDnsPtrPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	ip: Schema.String,
	dns_ptr: Schema.optional(Schema.NullOr(Schema.String)),
}).pipe(
	T.Http({ method: "POST", path: "/primary_ips/{id}/actions/change_dns_ptr" }),
) as unknown as Schema.Codec<PrimaryIpsIdActionsChangeDnsPtrPostInput>;

// Output Schema
export interface PrimaryIpsIdActionsChangeDnsPtrPostOutput {
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
export const PrimaryIpsIdActionsChangeDnsPtrPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<PrimaryIpsIdActionsChangeDnsPtrPostOutput>;

// The operation
/**
 * Change reverse DNS records for a Primary IP
 *
 * Change the reverse DNS records for this [Primary IP](#tag/primary-ips).
 * Allows to modify the PTR records set for the IP address.
 *
 * @param id - ID of the Primary IP.
 */
export const primaryIpsIdActionsChangeDnsPtrPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: PrimaryIpsIdActionsChangeDnsPtrPostInput,
	outputSchema: PrimaryIpsIdActionsChangeDnsPtrPostOutput,
}));
