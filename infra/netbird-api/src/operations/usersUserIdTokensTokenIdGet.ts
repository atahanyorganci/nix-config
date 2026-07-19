import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface UsersUserIdTokensTokenIdGetInput {
	userId: string;
	tokenId: string;
}
export const UsersUserIdTokensTokenIdGetInput = /*@__PURE__*/ Schema.Struct({
	userId: Schema.String.pipe(T.PathParam()),
	tokenId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/users/{userId}/tokens/{tokenId}" }),
) as unknown as Schema.Codec<UsersUserIdTokensTokenIdGetInput>;

// Output Schema
export interface UsersUserIdTokensTokenIdGetOutput {
	id: string;
	name: string;
	expiration_date: string;
	created_by: string;
	created_at: string;
	last_used?: string;
}
export const UsersUserIdTokensTokenIdGetOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	expiration_date: Schema.String,
	created_by: Schema.String,
	created_at: Schema.String,
	last_used: Schema.optional(Schema.String),
}) as unknown as Schema.Codec<UsersUserIdTokensTokenIdGetOutput>;

// The operation
/**
 * Retrieve a Token
 *
 * Returns a specific token for a user
 *
 * @param userId - The unique identifier of a user
 * @param tokenId - The unique identifier of a token
 */
export const usersUserIdTokensTokenIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersUserIdTokensTokenIdGetInput,
	outputSchema: UsersUserIdTokensTokenIdGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
