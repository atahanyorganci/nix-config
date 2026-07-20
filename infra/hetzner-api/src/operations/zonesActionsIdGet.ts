import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesActionsIdGetInput {
	id: number;
}
export const ZonesActionsIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "GET", path: "/zones/actions/{id}" })) as unknown as Schema.Codec<ZonesActionsIdGetInput>;

// Output Schema
export interface ZonesActionsIdGetOutput {
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
export const ZonesActionsIdGetOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ZonesActionsIdGetOutput>;

// The operation
/**
 * Get an Action
 *
 * Returns a specific [Action](#tag/actions).
 *
 * @param id - ID of the Action.
 */
export const zonesActionsIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesActionsIdGetInput,
	outputSchema: ZonesActionsIdGetOutput,
}));
