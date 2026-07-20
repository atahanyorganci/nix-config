import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsChangeProtectionPostInput {
	id: number;
	delete?: boolean;
	rebuild?: boolean;
}
export const ServersIdActionsChangeProtectionPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	delete: Schema.optional(Schema.Boolean),
	rebuild: Schema.optional(Schema.Boolean),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/change_protection" }),
) as unknown as Schema.Codec<ServersIdActionsChangeProtectionPostInput>;

// Output Schema
export interface ServersIdActionsChangeProtectionPostOutput {
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
export const ServersIdActionsChangeProtectionPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsChangeProtectionPostOutput>;

// The operation
/**
 * Change Server Protection
 *
 * Changes the protection configuration of the Server.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsChangeProtectionPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsChangeProtectionPostInput,
	outputSchema: ServersIdActionsChangeProtectionPostOutput,
}));
