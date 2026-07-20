import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface FloatingIpsIdActionsChangeProtectionPostInput {
	id: number;
	delete: boolean;
}
export const FloatingIpsIdActionsChangeProtectionPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	delete: Schema.Boolean,
}).pipe(
	T.Http({ method: "POST", path: "/floating_ips/{id}/actions/change_protection" }),
) as unknown as Schema.Codec<FloatingIpsIdActionsChangeProtectionPostInput>;

// Output Schema
export interface FloatingIpsIdActionsChangeProtectionPostOutput {
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
export const FloatingIpsIdActionsChangeProtectionPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<FloatingIpsIdActionsChangeProtectionPostOutput>;

// The operation
/**
 * Change Floating IP Protection
 *
 * Changes the protection settings configured for the [Floating IP](#tag/floating-ips).
 *
 * @param id - ID of the Floating IP.
 */
export const floatingIpsIdActionsChangeProtectionPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: FloatingIpsIdActionsChangeProtectionPostInput,
	outputSchema: FloatingIpsIdActionsChangeProtectionPostOutput,
}));
