import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound, UnprocessableEntity } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface UsersInvitesInviteIdRegeneratePostInput {
	inviteId: string;
	expires_in?: number;
}
export const UsersInvitesInviteIdRegeneratePostInput = /*@__PURE__*/ Schema.Struct({
	inviteId: Schema.String.pipe(T.PathParam()),
	expires_in: Schema.optional(Schema.Number),
}).pipe(
	T.Http({ method: "POST", path: "/api/users/invites/{inviteId}/regenerate" }),
) as unknown as Schema.Codec<UsersInvitesInviteIdRegeneratePostInput>;

// Output Schema
export interface UsersInvitesInviteIdRegeneratePostOutput {
	invite_token: string;
	invite_expires_at: string;
}
export const UsersInvitesInviteIdRegeneratePostOutput = /*@__PURE__*/ Schema.Struct({
	invite_token: Schema.String,
	invite_expires_at: Schema.String,
}) as unknown as Schema.Codec<UsersInvitesInviteIdRegeneratePostOutput>;

// The operation
/**
 * Regenerate a user invite
 *
 * Regenerates an invite link for an existing invite. Invalidates the previous token and creates a new one.
 *
 * @param inviteId - The ID of the invite to regenerate
 */
export const usersInvitesInviteIdRegeneratePost = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersInvitesInviteIdRegeneratePostInput,
	outputSchema: UsersInvitesInviteIdRegeneratePostOutput,
	errors: [BadRequest, Forbidden, NotFound, UnprocessableEntity] as const,
}));
