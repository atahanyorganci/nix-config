import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import { SensitiveString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface IdentityProvidersIdpIdPutInput {
	idpId: string;
	type: "oidc" | "zitadel" | "entra" | "google" | "okta" | "pocketid" | "microsoft" | "adfs";
	name: string;
	issuer: string;
	client_id: string;
	client_secret: string | Redacted.Redacted<string>;
}
export const IdentityProvidersIdpIdPutInput = /*@__PURE__*/ Schema.Struct({
	idpId: Schema.String.pipe(T.PathParam()),
	type: Schema.Literals(["oidc", "zitadel", "entra", "google", "okta", "pocketid", "microsoft", "adfs"]),
	name: Schema.String,
	issuer: Schema.String,
	client_id: Schema.String,
	client_secret: SensitiveString,
}).pipe(
	T.Http({ method: "PUT", path: "/api/identity-providers/{idpId}" }),
) as unknown as Schema.Codec<IdentityProvidersIdpIdPutInput>;

// Output Schema
export interface IdentityProvidersIdpIdPutOutput {
	id?: string;
	type: "oidc" | "zitadel" | "entra" | "google" | "okta" | "pocketid" | "microsoft" | "adfs";
	name: string;
	issuer: string;
	client_id: string;
}
export const IdentityProvidersIdpIdPutOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.optional(Schema.String),
	type: Schema.Literals(["oidc", "zitadel", "entra", "google", "okta", "pocketid", "microsoft", "adfs"]),
	name: Schema.String,
	issuer: Schema.String,
	client_id: Schema.String,
}) as unknown as Schema.Codec<IdentityProvidersIdpIdPutOutput>;

// The operation
/**
 * Update an Identity Provider
 *
 * Update an existing identity provider configuration
 *
 * @param idpId - The unique identifier of an identity provider
 */
export const identityProvidersIdpIdPut = /*@__PURE__*/ API.make(() => ({
	inputSchema: IdentityProvidersIdpIdPutInput,
	outputSchema: IdentityProvidersIdpIdPutOutput,
	errors: [BadRequest, Forbidden] as const,
}));
