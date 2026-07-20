import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FloatingIpsIdActionsAssignPostInput {
	id: number;
	server: number | null;
}
export const FloatingIpsIdActionsAssignPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	server: Schema.NullOr(Schema.Number),
}).pipe(
	T.Http({ method: "POST", path: "/floating_ips/{id}/actions/assign" }),
) as unknown as Schema.Codec<FloatingIpsIdActionsAssignPostInput>;

// Output Schema
export interface FloatingIpsIdActionsAssignPostOutput {
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
export const FloatingIpsIdActionsAssignPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<FloatingIpsIdActionsAssignPostOutput>;

// The operation
/**
 * Assign a Floating IP to a Server
 *
 * Assigns a [Floating IP](#tag/floating-ips) to a [Server](#tag/servers).
 * #### Operation specific errors
 *
 * @param id - ID of the Floating IP.
 */
export const floatingIpsIdActionsAssignPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: FloatingIpsIdActionsAssignPostInput,
	outputSchema: FloatingIpsIdActionsAssignPostOutput,
}));
