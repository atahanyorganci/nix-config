import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ZonesIdOrNameDeleteInput {
	idOrName: string;
}
export const ZonesIdOrNameDeleteInput = /*@__PURE__*/ Schema.Struct({
	idOrName: Schema.String.pipe(T.PathParam()),
}).pipe(T.Http({ method: "DELETE", path: "/zones/{idOrName}" })) as unknown as Schema.Codec<ZonesIdOrNameDeleteInput>;

// Output Schema
export interface ZonesIdOrNameDeleteOutput {
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
export const ZonesIdOrNameDeleteOutput = /*@__PURE__*/ Schema.Struct({
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
}) as unknown as Schema.Codec<ZonesIdOrNameDeleteOutput>;

// The operation
/**
 * Delete a Zone
 *
 * Deletes a [Zone](#tag/zones).
 *
 * @param idOrName - ID or Name of the Zone.
 */
export const zonesIdOrNameDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: ZonesIdOrNameDeleteInput,
	outputSchema: ZonesIdOrNameDeleteOutput,
}));
