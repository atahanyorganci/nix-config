import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsDetachIsoPostInput {
	id: number;
}
export const ServersIdActionsDetachIsoPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/detach_iso" }),
) as unknown as Schema.Codec<ServersIdActionsDetachIsoPostInput>;

// Output Schema
export interface ServersIdActionsDetachIsoPostOutput {
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
export const ServersIdActionsDetachIsoPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsDetachIsoPostOutput>;

// The operation
/**
 * Detach an ISO from a Server
 *
 * Detaches an ISO from a Server. In case no ISO Image is attached to the Server, the status of the returned Action is immediately set to `success`.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsDetachIsoPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsDetachIsoPostInput,
	outputSchema: ServersIdActionsDetachIsoPostOutput,
}));
