import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import { SensitiveString } from "../sensitive.ts";
import * as T from "../traits.ts";
import type * as Redacted from "effect/Redacted";

// Input Schema
export interface IdentityProvidersPostInput {
	type: "oidc" | "zitadel" | "entra" | "google" | "okta" | "pocketid" | "microsoft" | "adfs";
	name: string;
	issuer: string;
	client_id: string;
	client_secret: string | Redacted.Redacted<string>;
}
export const IdentityProvidersPostInput = /*@__PURE__*/ Schema.Struct({
	type: Schema.Literals(["oidc", "zitadel", "entra", "google", "okta", "pocketid", "microsoft", "adfs"]),
	name: Schema.String,
	issuer: Schema.String,
	client_id: Schema.String,
	client_secret: SensitiveString,
}).pipe(
	T.Http({ method: "POST", path: "/api/identity-providers" }),
) as unknown as Schema.Codec<IdentityProvidersPostInput>;

// Output Schema
export interface IdentityProvidersPostOutput {
	id?: string;
	type: "oidc" | "zitadel" | "entra" | "google" | "okta" | "pocketid" | "microsoft" | "adfs";
	name: string;
	issuer: string;
	client_id: string;
}
export const IdentityProvidersPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.optional(Schema.String),
	type: Schema.Literals(["oidc", "zitadel", "entra", "google", "okta", "pocketid", "microsoft", "adfs"]),
	name: Schema.String,
	issuer: Schema.String,
	client_id: Schema.String,
}) as unknown as Schema.Codec<IdentityProvidersPostOutput>;

// The operation
/**
 * Create an Identity Provider
 *
 * Creates a new identity provider configuration
 */
export const identityProvidersPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: IdentityProvidersPostInput,
	outputSchema: IdentityProvidersPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
