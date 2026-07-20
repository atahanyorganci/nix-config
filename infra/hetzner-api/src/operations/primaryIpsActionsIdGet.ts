import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PrimaryIpsActionsIdGetInput {
	id: number;
}
export const PrimaryIpsActionsIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/primary_ips/actions/{id}" }),
) as unknown as Schema.Codec<PrimaryIpsActionsIdGetInput>;

// Output Schema
export interface PrimaryIpsActionsIdGetOutput {
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
export const PrimaryIpsActionsIdGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<PrimaryIpsActionsIdGetOutput>;

// The operation
/**
 * Get an Action
 *
 * Returns a single [Action](#tag/actions).
 *
 * @param id - ID of the Action.
 */
export const primaryIpsActionsIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: PrimaryIpsActionsIdGetInput,
	outputSchema: PrimaryIpsActionsIdGetOutput,
}));
