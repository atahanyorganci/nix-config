import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, Conflict, UnprocessableEntity } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface UsersInvitesPostInput {
	email: string;
	name: string;
	role: string;
	auto_groups: ReadonlyArray<string>;
	expires_in?: number;
}
export const UsersInvitesPostInput = /*@__PURE__*/ Schema.Struct({
	email: Schema.String,
	name: Schema.String,
	role: Schema.String,
	auto_groups: Schema.Array(Schema.String),
	expires_in: Schema.optional(Schema.Number),
}).pipe(T.Http({ method: "POST", path: "/api/users/invites" })) as unknown as Schema.Codec<UsersInvitesPostInput>;

// Output Schema
export interface UsersInvitesPostOutput {
	id: string;
	email: string;
	name: string;
	role: string;
	auto_groups: ReadonlyArray<string>;
	expires_at: string;
	created_at: string;
	expired: boolean;
	invite_token?: string;
}
export const UsersInvitesPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	email: Schema.String,
	name: Schema.String,
	role: Schema.String,
	auto_groups: Schema.Array(Schema.String),
	expires_at: Schema.String,
	created_at: Schema.String,
	expired: Schema.Boolean,
	invite_token: Schema.optional(Schema.String),
}) as unknown as Schema.Codec<UsersInvitesPostOutput>;

// The operation
/**
 * Create a user invite
 *
 * Creates an invite link for a new user. Only available when embedded IdP is enabled. The user is not created until they accept the invite.
 */
export const usersInvitesPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersInvitesPostInput,
	outputSchema: UsersInvitesPostOutput,
	errors: [BadRequest, Forbidden, Conflict, UnprocessableEntity] as const,
}));
