import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import { SensitiveString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface UsersUserIdPasswordPutInput {
	userId: string;
	old_password: string | Redacted.Redacted<string>;
	new_password: string | Redacted.Redacted<string>;
}
export const UsersUserIdPasswordPutInput = /*@__PURE__*/ Schema.Struct({
	userId: Schema.String.pipe(T.PathParam()),
	old_password: SensitiveString,
	new_password: SensitiveString,
}).pipe(
	T.Http({ method: "PUT", path: "/api/users/{userId}/password" }),
) as unknown as Schema.Codec<UsersUserIdPasswordPutInput>;

// Output Schema
export type UsersUserIdPasswordPutOutput = void;
export const UsersUserIdPasswordPutOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<UsersUserIdPasswordPutOutput>;

// The operation
/**
 * Change user password
 *
 * Change the password for a user. Only available when embedded IdP is enabled. Users can only change their own password.
 *
 * @param userId - The unique identifier of a user
 */
export const usersUserIdPasswordPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersUserIdPasswordPutInput,
	outputSchema: UsersUserIdPasswordPutOutput,
	errors: [BadRequest, Forbidden] as const,
}));
