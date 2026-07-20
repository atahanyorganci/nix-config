import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface NetworksIdActionsChangeProtectionPostInput {
	id: number;
	delete?: boolean;
}
export const NetworksIdActionsChangeProtectionPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	delete: Schema.optional(Schema.Boolean),
}).pipe(
	T.Http({ method: "POST", path: "/networks/{id}/actions/change_protection" }),
) as unknown as Schema.Codec<NetworksIdActionsChangeProtectionPostInput>;

// Output Schema
export interface NetworksIdActionsChangeProtectionPostOutput {
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
export const NetworksIdActionsChangeProtectionPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<NetworksIdActionsChangeProtectionPostOutput>;

// The operation
/**
 * Change Network Protection
 *
 * Changes the protection settings of a [Network](#tag/networks).
 * If a change is currently being performed on this [Network](#tag/networks), a error response with code `conflict` will be returned.
 *
 * @param id - ID of the Network.
 */
export const networksIdActionsChangeProtectionPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: NetworksIdActionsChangeProtectionPostInput,
	outputSchema: NetworksIdActionsChangeProtectionPostOutput,
}));
