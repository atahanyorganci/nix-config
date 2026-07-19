import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IdentityProvidersGetInput {}
export const IdentityProvidersGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/identity-providers" }),
) as unknown as Schema.Codec<IdentityProvidersGetInput>;

// Output Schema
export type IdentityProvidersGetOutput = ReadonlyArray<{
	id?: string;
	type: "oidc" | "zitadel" | "entra" | "google" | "okta" | "pocketid" | "microsoft" | "adfs";
	name: string;
	issuer: string;
	client_id: string;
}>;
export const IdentityProvidersGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.optional(Schema.String),
		type: Schema.Literals(["oidc", "zitadel", "entra", "google", "okta", "pocketid", "microsoft", "adfs"]),
		name: Schema.String,
		issuer: Schema.String,
		client_id: Schema.String,
	}),
) as unknown as Schema.Codec<IdentityProvidersGetOutput>;

// The operation
/**
 * List all Identity Providers
 *
 * Returns a list of all identity providers configured for the account
 */
export const identityProvidersGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IdentityProvidersGetInput,
	outputSchema: IdentityProvidersGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
