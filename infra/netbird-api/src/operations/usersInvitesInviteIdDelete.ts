import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface UsersInvitesInviteIdDeleteInput {
	inviteId: string;
}
export const UsersInvitesInviteIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	inviteId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/users/invites/{inviteId}" }),
) as unknown as Schema.Codec<UsersInvitesInviteIdDeleteInput>;

// Output Schema
export type UsersInvitesInviteIdDeleteOutput = void;
export const UsersInvitesInviteIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<UsersInvitesInviteIdDeleteOutput>;

// The operation
/**
 * Delete a user invite
 *
 * Deletes a pending invite. Only available when embedded IdP is enabled.
 *
 * @param inviteId - The ID of the invite to delete
 */
export const usersInvitesInviteIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersInvitesInviteIdDeleteInput,
	outputSchema: UsersInvitesInviteIdDeleteOutput,
	errors: [Forbidden, NotFound] as const,
}));
