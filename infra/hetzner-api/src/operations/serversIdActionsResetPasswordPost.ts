import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { SensitiveOutputString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface ServersIdActionsResetPasswordPostInput {
	id: number;
}
export const ServersIdActionsResetPasswordPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/reset_password" }),
) as unknown as Schema.Codec<ServersIdActionsResetPasswordPostInput>;

// Output Schema
export interface ServersIdActionsResetPasswordPostOutput {
	root_password?: Redacted.Redacted<string>;
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
export const ServersIdActionsResetPasswordPostOutput = /*@__PURE__*/ Schema.Struct({
	root_password: Schema.optional(SensitiveOutputString),
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
}) as unknown as Schema.Codec<ServersIdActionsResetPasswordPostOutput>;

// The operation
/**
 * Reset root Password of a Server
 *
 * Resets the root password. Only works for Linux systems that are running the qemu guest agent. Server must be powered on (status `running`) in order for this operation to succeed.
 * This will generate a new password for this Server and return it.
 * If this does not succeed you can use the rescue system to netboot the Server and manually change your Server password by hand.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsResetPasswordPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsResetPasswordPostInput,
	outputSchema: ServersIdActionsResetPasswordPostOutput,
}));
