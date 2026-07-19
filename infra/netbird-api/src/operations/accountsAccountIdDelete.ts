import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface AccountsAccountIdDeleteInput {
	accountId: string;
}
export const AccountsAccountIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	accountId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/accounts/{accountId}" }),
) as unknown as Schema.Codec<AccountsAccountIdDeleteInput>;

// Output Schema
export type AccountsAccountIdDeleteOutput = void;
export const AccountsAccountIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<AccountsAccountIdDeleteOutput>;

// The operation
/**
 * Delete an Account
 *
 * Deletes an account and all its resources. Only account owners can delete accounts.
 *
 * @param accountId - The unique identifier of an account
 */
export const accountsAccountIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: AccountsAccountIdDeleteInput,
	outputSchema: AccountsAccountIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
