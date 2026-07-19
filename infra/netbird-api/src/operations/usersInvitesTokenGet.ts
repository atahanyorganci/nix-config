import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface UsersInvitesTokenGetInput {
	token: string;
}
export const UsersInvitesTokenGetInput = /*@__PURE__*/ Schema.Struct({
	token: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/users/invites/{token}" }),
) as unknown as Schema.Codec<UsersInvitesTokenGetInput>;

// Output Schema
export interface UsersInvitesTokenGetOutput {
	email: string;
	name: string;
	expires_at: string;
	valid: boolean;
	invited_by: string;
}
export const UsersInvitesTokenGetOutput = /*@__PURE__*/ Schema.Struct({
	email: Schema.String,
	name: Schema.String,
	expires_at: Schema.String,
	valid: Schema.Boolean,
	invited_by: Schema.String,
}) as unknown as Schema.Codec<UsersInvitesTokenGetOutput>;

// The operation
/**
 * Get invite information
 *
 * Retrieves public information about an invite. This endpoint is unauthenticated and protected by the token itself.
 *
 * @param token - The invite token
 */
export const usersInvitesTokenGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersInvitesTokenGetInput,
	outputSchema: UsersInvitesTokenGetOutput,
	errors: [BadRequest, NotFound] as const,
}));
