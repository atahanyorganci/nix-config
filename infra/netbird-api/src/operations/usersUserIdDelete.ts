import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface UsersUserIdDeleteInput {
	userId: string;
}
export const UsersUserIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	userId: Schema.String.pipe(T.PathParam()),
}).pipe(T.Http({ method: "DELETE", path: "/api/users/{userId}" })) as unknown as Schema.Codec<UsersUserIdDeleteInput>;

// Output Schema
export type UsersUserIdDeleteOutput = void;
export const UsersUserIdDeleteOutput = /*@__PURE__*/ Schema.Void as unknown as Schema.Codec<UsersUserIdDeleteOutput>;

// The operation
/**
 * Delete a User
 *
 * This method removes a user from accessing the system. For this leaves the IDP user intact unless the `--user-delete-from-idp` is passed to management startup.
 *
 * @param userId - The unique identifier of a user
 */
export const usersUserIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: UsersUserIdDeleteInput,
	outputSchema: UsersUserIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
