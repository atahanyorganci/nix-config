import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsAttachIsoPostInput {
	id: number;
	iso: string;
}
export const ServersIdActionsAttachIsoPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
	iso: Schema.String,
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/attach_iso" }),
) as unknown as Schema.Codec<ServersIdActionsAttachIsoPostInput>;

// Output Schema
export interface ServersIdActionsAttachIsoPostOutput {
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
export const ServersIdActionsAttachIsoPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsAttachIsoPostOutput>;

// The operation
/**
 * Attach an ISO to a Server
 *
 * Attaches an ISO to a Server. The Server will immediately see it as a new disk. An already attached ISO will automatically be detached before the new ISO is attached.
 * Servers with attached ISOs have a modified boot order: They will try to boot from the ISO first before falling back to hard disk.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsAttachIsoPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsAttachIsoPostInput,
	outputSchema: ServersIdActionsAttachIsoPostOutput,
}));
