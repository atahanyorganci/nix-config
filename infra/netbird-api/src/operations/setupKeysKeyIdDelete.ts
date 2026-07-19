import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface SetupKeysKeyIdDeleteInput {
	keyId: string;
}
export const SetupKeysKeyIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	keyId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/setup-keys/{keyId}" }),
) as unknown as Schema.Codec<SetupKeysKeyIdDeleteInput>;

// Output Schema
export type SetupKeysKeyIdDeleteOutput = void;
export const SetupKeysKeyIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<SetupKeysKeyIdDeleteOutput>;

// The operation
/**
 * Delete a Setup Key
 *
 * @param keyId - The unique identifier of a setup key
 */
export const setupKeysKeyIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: SetupKeysKeyIdDeleteInput,
	outputSchema: SetupKeysKeyIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
