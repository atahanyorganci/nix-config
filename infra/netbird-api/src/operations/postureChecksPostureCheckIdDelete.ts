import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface PostureChecksPostureCheckIdDeleteInput {
	postureCheckId: string;
}
export const PostureChecksPostureCheckIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	postureCheckId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/posture-checks/{postureCheckId}" }),
) as unknown as Schema.Codec<PostureChecksPostureCheckIdDeleteInput>;

// Output Schema
export type PostureChecksPostureCheckIdDeleteOutput = void;
export const PostureChecksPostureCheckIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<PostureChecksPostureCheckIdDeleteOutput>;

// The operation
/**
 * Delete a Posture Check
 *
 * Delete a posture check
 *
 * @param postureCheckId - The unique identifier of a posture check
 */
export const postureChecksPostureCheckIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: PostureChecksPostureCheckIdDeleteInput,
	outputSchema: PostureChecksPostureCheckIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
