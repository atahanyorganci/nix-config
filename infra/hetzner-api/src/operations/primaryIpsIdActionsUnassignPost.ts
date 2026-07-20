import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PrimaryIpsIdActionsUnassignPostInput {
	id: number;
}
export const PrimaryIpsIdActionsUnassignPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/primary_ips/{id}/actions/unassign" }),
) as unknown as Schema.Codec<PrimaryIpsIdActionsUnassignPostInput>;

// Output Schema
export interface PrimaryIpsIdActionsUnassignPostOutput {
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
export const PrimaryIpsIdActionsUnassignPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<PrimaryIpsIdActionsUnassignPostOutput>;

// The operation
/**
 * Unassign a Primary IP from a resource
 *
 * Unassign a [Primary IP](#tag/primary-ips) from a resource.
 * A [Server](#tag/servers) must be powered off (status `off`) in order for this operation to succeed.
 * A [Server](#tag/servers) requires at least one network interface (public or private) to be powered on.
 * #### Operation specific errors
 *
 * @param id - ID of the Primary IP.
 */
export const primaryIpsIdActionsUnassignPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: PrimaryIpsIdActionsUnassignPostInput,
	outputSchema: PrimaryIpsIdActionsUnassignPostOutput,
}));
