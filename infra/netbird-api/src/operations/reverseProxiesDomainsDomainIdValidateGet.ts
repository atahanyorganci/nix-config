import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ReverseProxiesDomainsDomainIdValidateGetInput {
	domainId: string;
}
export const ReverseProxiesDomainsDomainIdValidateGetInput = /*@__PURE__*/ Schema.Struct({
	domainId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "GET", path: "/api/reverse-proxies/domains/{domainId}/validate" }),
) as unknown as Schema.Codec<ReverseProxiesDomainsDomainIdValidateGetInput>;

// Output Schema
export type ReverseProxiesDomainsDomainIdValidateGetOutput = void;
export const ReverseProxiesDomainsDomainIdValidateGetOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<ReverseProxiesDomainsDomainIdValidateGetOutput>;

// The operation
/**
 * Validate a custom domain
 *
 * Trigger domain ownership validation for a custom domain
 *
 * @param domainId - The custom domain ID
 */
export const reverseProxiesDomainsDomainIdValidateGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ReverseProxiesDomainsDomainIdValidateGetInput,
	outputSchema: ReverseProxiesDomainsDomainIdValidateGetOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
