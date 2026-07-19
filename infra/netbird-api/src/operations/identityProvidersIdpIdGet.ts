import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IdentityProvidersIdpIdGetInput {
	idpId: string;
}
export const IdentityProvidersIdpIdGetInput = /*@__PURE__*/ Schema.Struct({
	idpId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/identity-providers/{idpId}" }),
) as unknown as Schema.Codec<IdentityProvidersIdpIdGetInput>;

// Output Schema
export interface IdentityProvidersIdpIdGetOutput {
	id?: string;
	type: "oidc" | "zitadel" | "entra" | "google" | "okta" | "pocketid" | "microsoft" | "adfs";
	name: string;
	issuer: string;
	client_id: string;
}
export const IdentityProvidersIdpIdGetOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.optional(Schema.String),
	type: Schema.Literals(["oidc", "zitadel", "entra", "google", "okta", "pocketid", "microsoft", "adfs"]),
	name: Schema.String,
	issuer: Schema.String,
	client_id: Schema.String,
}) as unknown as Schema.Codec<IdentityProvidersIdpIdGetOutput>;

// The operation
/**
 * Retrieve an Identity Provider
 *
 * Get information about a specific identity provider
 *
 * @param idpId - The unique identifier of an identity provider
 */
export const identityProvidersIdpIdGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: IdentityProvidersIdpIdGetInput,
	outputSchema: IdentityProvidersIdpIdGetOutput,
	errors: [BadRequest, Forbidden] as const,
}));
