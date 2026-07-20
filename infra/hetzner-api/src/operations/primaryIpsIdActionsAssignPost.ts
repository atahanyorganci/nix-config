import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PrimaryIpsIdActionsAssignPostInput {
	id: number;
	assignee_type: "server";
	assignee_id: number;
}
export const PrimaryIpsIdActionsAssignPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	assignee_type: Schema.Literals(["server"]),
	assignee_id: Schema.Number,
}).pipe(
	T.Http({ method: "POST", path: "/primary_ips/{id}/actions/assign" }),
) as unknown as Schema.Codec<PrimaryIpsIdActionsAssignPostInput>;

// Output Schema
export interface PrimaryIpsIdActionsAssignPostOutput {
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
export const PrimaryIpsIdActionsAssignPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<PrimaryIpsIdActionsAssignPostOutput>;

// The operation
/**
 * Assign a Primary IP to a resource
 *
 * Assign a [Primary IP](#tag/primary-ips) to a resource.
 * A [Server](#tag/servers) can only have one [Primary IP](#tag/primary-ips) of type `ipv4` and one of type `ipv6` assigned. If you need more IPs use [Floating IPs](#tag/floating-ips).
 * A [Server](#tag/servers) must be powered off (status `off`) in order for this operation to succeed.
 * #### Operation specific errors
 *
 * @param id - ID of the Primary IP.
 */
export const primaryIpsIdActionsAssignPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: PrimaryIpsIdActionsAssignPostInput,
	outputSchema: PrimaryIpsIdActionsAssignPostOutput,
}));
