import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { SensitiveOutputNullableString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface ServersIdActionsRebuildPostInput {
	id: number;
	image: string;
	user_data?: string;
}
export const ServersIdActionsRebuildPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	image: Schema.String,
	user_data: Schema.optional(Schema.String),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/rebuild" }),
) as unknown as Schema.Codec<ServersIdActionsRebuildPostInput>;

// Output Schema
export interface ServersIdActionsRebuildPostOutput {
	root_password?: Redacted.Redacted<string> | null;
	action?: {
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
export const ServersIdActionsRebuildPostOutput = /*@__PURE__*/ Schema.Struct({
	root_password: Schema.optional(SensitiveOutputNullableString),
	action: Schema.optional(
		Schema.Struct({
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
	),
}) as unknown as Schema.Codec<ServersIdActionsRebuildPostOutput>;

// The operation
/**
 * Rebuild a Server from an Image
 *
 * Rebuilds a Server overwriting its disk with the content of an Image, thereby **destroying all data** on the target Server
 * The Image can either be one you have created earlier (`backup` or `snapshot` Image) or it can be a completely fresh `system` Image provided by us. You can get a list of all available Images with `GET /images`.
 * Your Server will automatically be powered off before the rebuild command executes.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsRebuildPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsRebuildPostInput,
	outputSchema: ServersIdActionsRebuildPostOutput,
}));
