import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface UsersUserIdInvitePostInput {
	userId: string;
}
export const UsersUserIdInvitePostInput = /*@__PURE__*/ Schema.Struct({
	userId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "POST", path: "/api/users/{userId}/invite" }),
) as unknown as Schema.Codec<UsersUserIdInvitePostInput>;

// Output Schema
export type UsersUserIdInvitePostOutput = void;
export const UsersUserIdInvitePostOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<UsersUserIdInvitePostOutput>;

// The operation
/**
 * Resend user invitation
 *
 * @param userId - The unique identifier of a user
 */
export const usersUserIdInvitePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersUserIdInvitePostInput,
	outputSchema: UsersUserIdInvitePostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
