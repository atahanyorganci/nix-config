import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { SensitiveOutputString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface ServersIdActionsRequestConsolePostInput {
	id: number;
}
export const ServersIdActionsRequestConsolePostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/request_console" }),
) as unknown as Schema.Codec<ServersIdActionsRequestConsolePostInput>;

// Output Schema
export interface ServersIdActionsRequestConsolePostOutput {
	wss_url: string;
	password: Redacted.Redacted<string>;
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
export const ServersIdActionsRequestConsolePostOutput = /*@__PURE__*/ Schema.Struct({
	wss_url: Schema.String,
	password: SensitiveOutputString,
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
}) as unknown as Schema.Codec<ServersIdActionsRequestConsolePostOutput>;

// The operation
/**
 * Request Console for a Server
 *
 * Requests credentials for remote access via VNC over websocket to keyboard, monitor, and mouse for a Server. The provided URL is valid for 1 minute, after this period a new url needs to be created to connect to the Server. How long the connection is open after the initial connect is not subject to this timeout.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsRequestConsolePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsRequestConsolePostInput,
	outputSchema: ServersIdActionsRequestConsolePostOutput,
}));
