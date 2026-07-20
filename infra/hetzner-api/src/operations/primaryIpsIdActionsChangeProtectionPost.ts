import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PrimaryIpsIdActionsChangeProtectionPostInput {
	id: number;
	delete: boolean;
}
export const PrimaryIpsIdActionsChangeProtectionPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	delete: Schema.Boolean,
}).pipe(
	T.Http({ method: "POST", path: "/primary_ips/{id}/actions/change_protection" }),
) as unknown as Schema.Codec<PrimaryIpsIdActionsChangeProtectionPostInput>;

// Output Schema
export interface PrimaryIpsIdActionsChangeProtectionPostOutput {
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
export const PrimaryIpsIdActionsChangeProtectionPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<PrimaryIpsIdActionsChangeProtectionPostOutput>;

// The operation
/**
 * Change Primary IP Protection
 *
 * Changes the protection configuration of a [Primary IP](#tag/primary-ips).
 * A [Primary IPs](#tag/primary-ips) deletion protection can only be enabled if its `auto_delete` property is set to `false`.
 *
 * @param id - ID of the Primary IP.
 */
export const primaryIpsIdActionsChangeProtectionPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: PrimaryIpsIdActionsChangeProtectionPostInput,
	outputSchema: PrimaryIpsIdActionsChangeProtectionPostOutput,
}));
