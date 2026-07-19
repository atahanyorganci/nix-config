import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { BadRequest, Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ReverseProxiesProxyTokensPostInput {
	name: string;
	expires_in?: number;
}
export const ReverseProxiesProxyTokensPostInput = /*@__PURE__*/ Schema.Struct({
	name: Schema.String,
	expires_in: Schema.optional(Schema.Number),
}).pipe(
	T.Http({ method: "POST", path: "/api/reverse-proxies/proxy-tokens" }),
) as unknown as Schema.Codec<ReverseProxiesProxyTokensPostInput>;

// Output Schema
export interface ReverseProxiesProxyTokensPostOutput {
	id: string;
	name: string;
	expires_at?: string;
	created_at: string;
	last_used?: string;
	revoked: boolean;
	plain_token: string;
}
export const ReverseProxiesProxyTokensPostOutput = /*@__PURE__*/ Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	expires_at: Schema.optional(Schema.String),
	created_at: Schema.String,
	last_used: Schema.optional(Schema.String),
	revoked: Schema.Boolean,
	plain_token: Schema.String,
}) as unknown as Schema.Codec<ReverseProxiesProxyTokensPostOutput>;

// The operation
/**
 * Create a Proxy Token
 *
 * Generate an account-scoped proxy access token for self-hosted proxy registration
 */
export const reverseProxiesProxyTokensPost = /*@__PURE__*/ API.make(() => ({
	inputSchema: ReverseProxiesProxyTokensPostInput,
	outputSchema: ReverseProxiesProxyTokensPostOutput,
	errors: [BadRequest, Forbidden] as const,
}));
