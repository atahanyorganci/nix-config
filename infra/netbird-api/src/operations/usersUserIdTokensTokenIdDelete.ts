import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface UsersUserIdTokensTokenIdDeleteInput {
	userId: string;
	tokenId: string;
}
export const UsersUserIdTokensTokenIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	userId: Schema.String.pipe(T.PathParam()),
	tokenId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/users/{userId}/tokens/{tokenId}" }),
) as unknown as Schema.Codec<UsersUserIdTokensTokenIdDeleteInput>;

// Output Schema
export type UsersUserIdTokensTokenIdDeleteOutput = void;
export const UsersUserIdTokensTokenIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<UsersUserIdTokensTokenIdDeleteOutput>;

// The operation
/**
 * Delete a Token
 *
 * Delete a token for a user
 *
 * @param userId - The unique identifier of a user
 * @param tokenId - The unique identifier of a token
 */
export const usersUserIdTokensTokenIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersUserIdTokensTokenIdDeleteInput,
	outputSchema: UsersUserIdTokensTokenIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
