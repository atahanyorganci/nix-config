import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNameActionsChangeProtectionPostInput {
	idOrName: string;
	delete?: boolean;
}
export const ZonesIdOrNameActionsChangeProtectionPostInput = /*@__PURE__*/ Schema.Struct({
	idOrName: Schema.String.pipe(T.PathParam()),
	delete: Schema.optional(Schema.Boolean),
}).pipe(
	T.Http({ method: "POST", path: "/zones/{idOrName}/actions/change_protection" }),
) as unknown as Schema.Codec<ZonesIdOrNameActionsChangeProtectionPostInput>;

// Output Schema
export interface ZonesIdOrNameActionsChangeProtectionPostOutput {
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
export const ZonesIdOrNameActionsChangeProtectionPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ZonesIdOrNameActionsChangeProtectionPostOutput>;

// The operation
/**
 * Change a Zone's Protection
 *
 * Changes the protection configuration of a [Zone](#tag/zones).
 *
 * @param idOrName - ID or Name of the Zone.
 */
export const zonesIdOrNameActionsChangeProtectionPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNameActionsChangeProtectionPostInput,
	outputSchema: ZonesIdOrNameActionsChangeProtectionPostOutput,
}));
