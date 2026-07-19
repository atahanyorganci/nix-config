import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface UsersUserIdTokensGetInput {
	userId: string;
}
export const UsersUserIdTokensGetInput = /*@__PURE__*/ Schema.Struct({
	userId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/users/{userId}/tokens" }),
) as unknown as Schema.Codec<UsersUserIdTokensGetInput>;

// Output Schema
export type UsersUserIdTokensGetOutput = ReadonlyArray<{
	id: string;
	name: string;
	expiration_date: string;
	created_by: string;
	created_at: string;
	last_used?: string;
}>;
export const UsersUserIdTokensGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		name: Schema.String,
		expiration_date: Schema.String,
		created_by: Schema.String,
		created_at: Schema.String,
		last_used: Schema.optional(Schema.String),
	}),
) as unknown as Schema.Codec<UsersUserIdTokensGetOutput>;

// The operation
/**
 * List all Tokens
 *
 * Returns a list of all tokens for a user
 *
 * @param userId - The unique identifier of a user
 */
export const usersUserIdTokensGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersUserIdTokensGetInput,
	outputSchema: UsersUserIdTokensGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
