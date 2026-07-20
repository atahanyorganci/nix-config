import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FloatingIpsIdActionsUnassignPostInput {
	id: number;
}
export const FloatingIpsIdActionsUnassignPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/floating_ips/{id}/actions/unassign" }),
) as unknown as Schema.Codec<FloatingIpsIdActionsUnassignPostInput>;

// Output Schema
export interface FloatingIpsIdActionsUnassignPostOutput {
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
export const FloatingIpsIdActionsUnassignPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<FloatingIpsIdActionsUnassignPostOutput>;

// The operation
/**
 * Unassign a Floating IP
 *
 * Unassigns a [Floating IP](#tag/floating-ips).
 * Results in the IP being unreachable. Can be assigned to another resource again.
 *
 * @param id - ID of the Floating IP.
 */
export const floatingIpsIdActionsUnassignPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: FloatingIpsIdActionsUnassignPostInput,
	outputSchema: FloatingIpsIdActionsUnassignPostOutput,
}));
