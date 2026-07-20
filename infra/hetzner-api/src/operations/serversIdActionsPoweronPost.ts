import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ServersIdActionsPoweronPostInput {
	id: number;
}
export const ServersIdActionsPoweronPostInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/servers/{id}/actions/poweron" }),
) as unknown as Schema.Codec<ServersIdActionsPoweronPostInput>;

// Output Schema
export interface ServersIdActionsPoweronPostOutput {
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
export const ServersIdActionsPoweronPostOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ServersIdActionsPoweronPostOutput>;

// The operation
/**
 * Power on a Server
 *
 * Starts a Server by turning its power on.
 *
 * @param id - ID of the Server.
 */
export const serversIdActionsPoweronPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ServersIdActionsPoweronPostInput,
	outputSchema: ServersIdActionsPoweronPostOutput,
}));
