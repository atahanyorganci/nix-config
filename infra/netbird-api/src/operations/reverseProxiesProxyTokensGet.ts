import * as Schema from "effect/Schema";
import { API } from "../client.ts";
import { Forbidden } from "../errors.ts";
import * as T from "../traits.ts";

// Input Schema
export interface ReverseProxiesProxyTokensGetInput {}
export const ReverseProxiesProxyTokensGetInput = /*@__PURE__*/ Schema.Struct({}).pipe(
	T.Http({ method: "GET", path: "/api/reverse-proxies/proxy-tokens" }),
) as unknown as Schema.Codec<ReverseProxiesProxyTokensGetInput>;

// Output Schema
export type ReverseProxiesProxyTokensGetOutput = ReadonlyArray<{
	id: string;
	name: string;
	expires_at?: string;
	created_at: string;
	last_used?: string;
	revoked: boolean;
}>;
export const ReverseProxiesProxyTokensGetOutput = /*@__PURE__*/ Schema.Array(
	Schema.Struct({
		id: Schema.String,
		name: Schema.String,
		expires_at: Schema.optional(Schema.String),
		created_at: Schema.String,
		last_used: Schema.optional(Schema.String),
		revoked: Schema.Boolean,
	}),
) as unknown as Schema.Codec<ReverseProxiesProxyTokensGetOutput>;

// The operation
/**
 * List Proxy Tokens
 *
 * Returns all proxy access tokens for the account
 */
export const reverseProxiesProxyTokensGet = /*@__PURE__*/ API.make(() => ({
	inputSchema: ReverseProxiesProxyTokensGetInput,
	outputSchema: ReverseProxiesProxyTokensGetOutput,
	errors: [Forbidden] as const,
}));
