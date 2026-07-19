import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound, UnprocessableEntity } from "../errors.ts";
import { SensitiveString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface UsersInvitesTokenAcceptPostInput {
	token: string;
	password: string | Redacted.Redacted<string>;
}
export const UsersInvitesTokenAcceptPostInput = /*@__PURE__*/ Schema.Struct({
	token: Schema.String.pipe(T.PathParam()),
	password: SensitiveString,
}).pipe(
	T.Http({ method: "POST", path: "/api/users/invites/{token}/accept" }),
) as unknown as Schema.Codec<UsersInvitesTokenAcceptPostInput>;

// Output Schema
export interface UsersInvitesTokenAcceptPostOutput {
	success: boolean;
}
export const UsersInvitesTokenAcceptPostOutput = /*@__PURE__*/ Schema.Struct({
	success: Schema.Boolean,
}) as unknown as Schema.Codec<UsersInvitesTokenAcceptPostOutput>;

// The operation
/**
 * Accept an invite
 *
 * Accepts an invite and creates the user with the provided password. This endpoint is unauthenticated and protected by the token itself.
 *
 * @param token - The invite token
 */
export const usersInvitesTokenAcceptPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersInvitesTokenAcceptPostInput,
	outputSchema: UsersInvitesTokenAcceptPostOutput,
	errors: [BadRequest, NotFound, UnprocessableEntity] as const,
}));
