import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ReverseProxiesDomainsDomainIdDeleteInput {
	domainId: string;
}
export const ReverseProxiesDomainsDomainIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	domainId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/reverse-proxies/domains/{domainId}" }),
) as unknown as Schema.Codec<ReverseProxiesDomainsDomainIdDeleteInput>;

// Output Schema
export type ReverseProxiesDomainsDomainIdDeleteOutput = void;
export const ReverseProxiesDomainsDomainIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<ReverseProxiesDomainsDomainIdDeleteOutput>;

// The operation
/**
 * Delete a Custom domain
 *
 * Delete an existing service custom domain
 *
 * @param domainId - The custom domain ID
 */
export const reverseProxiesDomainsDomainIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: ReverseProxiesDomainsDomainIdDeleteInput,
	outputSchema: ReverseProxiesDomainsDomainIdDeleteOutput,
	errors: [BadRequest, Forbidden, NotFound] as const,
}));
