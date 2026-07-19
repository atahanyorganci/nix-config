import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden, NotFound } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ReverseProxiesProxyTokensTokenIdDeleteInput {
	tokenId: string;
}
export const ReverseProxiesProxyTokensTokenIdDeleteInput = /*@__PURE__*/ Schema.Struct({
	tokenId: Schema.String.pipe(T.PathParam()),
}).pipe(
	T.Http({ method: "DELETE", path: "/api/reverse-proxies/proxy-tokens/{tokenId}" }),
) as unknown as Schema.Codec<ReverseProxiesProxyTokensTokenIdDeleteInput>;

// Output Schema
export type ReverseProxiesProxyTokensTokenIdDeleteOutput = void;
export const ReverseProxiesProxyTokensTokenIdDeleteOutput =
	/*@__PURE__*/ Schema.Void as unknown as Schema.Codec<ReverseProxiesProxyTokensTokenIdDeleteOutput>;

// The operation
/**
 * Revoke a Proxy Token
 *
 * Revoke an account-scoped proxy access token
 *
 * @param tokenId - The unique identifier of the proxy token
 */
export const reverseProxiesProxyTokensTokenIdDelete = /*@__PURE__*/ API.make(() => ({
	inputSchema: ReverseProxiesProxyTokensTokenIdDeleteInput,
	outputSchema: ReverseProxiesProxyTokensTokenIdDeleteOutput,
	errors: [Forbidden, NotFound] as const,
}));
