import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface UsersInvitesGetInput {}
export const UsersInvitesGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/users/invites" }),
) as unknown as Schema.Codec<UsersInvitesGetInput>;

// Output Schema
export type UsersInvitesGetOutput = ReadonlyArray<{
	id: string;
	email: string;
	name: string;
	role: string;
	auto_groups: ReadonlyArray<string>;
	expires_at: string;
	created_at: string;
	expired: boolean;
	invite_token?: string;
}>;
export const UsersInvitesGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		email: Schema.String,
		name: Schema.String,
		role: Schema.String,
		auto_groups: Schema.Array(Schema.String),
		expires_at: Schema.String,
		created_at: Schema.String,
		expired: Schema.Boolean,
		invite_token: Schema.optional(Schema.String),
	}),
) as unknown as Schema.Codec<UsersInvitesGetOutput>;

// The operation
/**
 * List user invites
 *
 * Lists all pending invites for the account. Only available when embedded IdP is enabled.
 */
export const usersInvitesGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersInvitesGetInput,
	outputSchema: UsersInvitesGetOutput,
	errors: [Forbidden] as const,
}));
