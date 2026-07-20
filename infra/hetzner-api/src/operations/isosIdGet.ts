import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IsosIdGetInput {
	id: number;
}
export const IsosIdGetInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "GET", path: "/isos/{id}" })) as unknown as Schema.Codec<IsosIdGetInput>;

// Output Schema
export interface IsosIdGetOutput {
	iso: {
		id: number;
		name: string | null;
		description: string;
		type: "public" | "private" | null;
		deprecation: { unavailable_after: string; announced: string } | null;
		architecture: "x86" | "arm" | null;
	};
}
export const IsosIdGetOutput = /*@__PURE__*/ Schema.Struct({
	iso: Schema.Struct({
		id: Schema.Number,
		name: Schema.NullOr(Schema.String),
		description: Schema.String,
		type: Schema.NullOr(Schema.Literals(["public", "private"])),
		deprecation: Schema.NullOr(
			Schema.Struct({
				unavailable_after: Schema.String,
				announced: Schema.String,
			}),
		),
		architecture: Schema.NullOr(Schema.Literals(["x86", "arm"])),
	}),
}) as unknown as Schema.Codec<IsosIdGetOutput>;

// The operation
/**
 * Get an ISO
 *
 * Returns a specific ISO object.
 *
 * @param id - ID of the ISO.
 */
export const isosIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IsosIdGetInput,
	outputSchema: IsosIdGetOutput,
}));
