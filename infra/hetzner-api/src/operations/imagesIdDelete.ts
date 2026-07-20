import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ImagesIdDeleteInput {
	id: number;
}
export const ImagesIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	id: Schema.Number.pipe(T.PathParam()),
}).pipe(T.Http({ method: "DELETE", path: "/images/{id}" })) as unknown as Schema.Codec<ImagesIdDeleteInput>;

// Output Schema
export type ImagesIdDeleteOutput = void;
export const ImagesIdDeleteOutput = /*@__PURE__*/ Schema.Void as unknown as Schema.Codec<ImagesIdDeleteOutput>;

// The operation
/**
 * Delete an Image
 *
 * Deletes an Image. Only Images of type `snapshot` and `backup` can be deleted.
 *
 * @param id - ID of the Image.
 */
export const imagesIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: ImagesIdDeleteInput,
	outputSchema: ImagesIdDeleteOutput,
}));
