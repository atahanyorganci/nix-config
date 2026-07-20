import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsPoweroffPostInput {
	id: number;
}
export const ServersIdActionsPoweroffPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/poweroff" }),
) as unknown as Schema.Codec<ServersIdActionsPoweroffPostInput>;

// Output Schema
export interface ServersIdActionsPoweroffPostOutput {
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
export const ServersIdActionsPoweroffPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsPoweroffPostOutput>;

// The operation
/**
 * Power off a Server
 *
 * Cuts power to the Server. This forcefully stops it without giving the Server operating system time to gracefully stop. May lead to data loss, equivalent to pulling the power cord. Power off should only be used when shutdown does not work.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsPoweroffPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsPoweroffPostInput,
	outputSchema: ServersIdActionsPoweroffPostOutput,
}));
