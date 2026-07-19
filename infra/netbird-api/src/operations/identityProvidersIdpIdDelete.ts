import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface IdentityProvidersIdpIdDeleteInput {
	idpId: string;
}
export const IdentityProvidersIdpIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	idpId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/identity-providers/{idpId}" }),
) as unknown as Schema.Codec<IdentityProvidersIdpIdDeleteInput>;

// Output Schema
export type IdentityProvidersIdpIdDeleteOutput = void;
export const IdentityProvidersIdpIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<IdentityProvidersIdpIdDeleteOutput>;

// The operation
/**
 * Delete an Identity Provider
 *
 * Delete an identity provider configuration
 *
 * @param idpId - The unique identifier of an identity provider
 */
export const identityProvidersIdpIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: IdentityProvidersIdpIdDeleteInput,
	outputSchema: IdentityProvidersIdpIdDeleteOutput,
	errors: [BadRequest, Forbidden] as const,
}));
