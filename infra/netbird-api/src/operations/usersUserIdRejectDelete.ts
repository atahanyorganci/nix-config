import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface UsersUserIdRejectDeleteInput {
	userId: string;
}
export const UsersUserIdRejectDeleteInput = /*@__PURE__*/ Schema.Struct({
	userId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/users/{userId}/reject" }),
) as unknown as Schema.Codec<UsersUserIdRejectDeleteInput>;

// Output Schema
export type UsersUserIdRejectDeleteOutput = void;
export const UsersUserIdRejectDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<UsersUserIdRejectDeleteOutput>;

// The operation
/**
 * Reject user
 *
 * Reject a user that is pending approval by removing them from the account
 *
 * @param userId - The unique identifier of a user
 */
export const usersUserIdRejectDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersUserIdRejectDeleteInput,
	outputSchema: UsersUserIdRejectDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
