import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface UsersUserIdTokensPostInput {
	userId: string;
	name: string;
	expires_in: number;
}
export const UsersUserIdTokensPostInput = /*@__PURE__*/ Schema.Struct({
	userId: Schema.String.pipe(T.PathParam()),
	name: Schema.String,
	expires_in: Schema.Number,
}).pipe(
	T.Http({ method: "POST", path: "/api/users/{userId}/tokens" }),
) as unknown as Schema.Codec<UsersUserIdTokensPostInput>;

// Output Schema
export interface UsersUserIdTokensPostOutput {
	plain_token: string;
	personal_access_token: {
		id: string;
		name: string;
		expiration_date: string;
		created_by: string;
		created_at: string;
		last_used?: string;
	};
}
export const UsersUserIdTokensPostOutput = /*@__PURE__*/ Schema.Struct({
	plain_token: Schema.String,
	personal_access_token: Schema.Struct({
		id: Schema.String,
		name: Schema.String,
		expiration_date: Schema.String,
		created_by: Schema.String,
		created_at: Schema.String,
		last_used: Schema.optional(Schema.String),
	}),
}) as unknown as Schema.Codec<UsersUserIdTokensPostOutput>;

// The operation
/**
 * Create a Token
 *
 * Create a new token for a user
 *
 * @param userId - The unique identifier of a user
 */
export const usersUserIdTokensPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersUserIdTokensPostInput,
	outputSchema: UsersUserIdTokensPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
