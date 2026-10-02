/**
 * NetbirdProtocol — distilled's bearer-REST protocol instantiated for the
 * NetBird management API.
 *
 * NetBird speaks plain JSON with no success envelope: objects come back bare
 * and list endpoints answer with bare arrays. Failures are `{ message, code }`
 * at the top level, where the self-hosted server sets `code` to the numeric
 * HTTP status and NetBird Cloud may use strings.
 *
 * The API is rooted at `/api` on the management host, and the generated
 * routes carry that prefix, so `managementUrl` is the bare origin.
 */
import * as API from "@distilled.cloud/core/api";
import { HTTP_STATUS_MAP, type ConfigError } from "@distilled.cloud/core/errors";
import { resolveNode } from "@distilled.cloud/core/protocol-http";
import { makeRestProtocol, type RestErrorEnvelope } from "@distilled.cloud/core/protocol-rest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { Credentials, type Config } from "./credentials.ts";
import { NetbirdParseError, UnknownNetbirdError, type DefaultErrors } from "./errors.ts";
import type * as HttpClient from "effect/http/HttpClient";
import type * as HttpClientError from "effect/http/HttpClientError";
import type * as AST from "effect/SchemaAST";

/** Error channel shared by every generated NetBird operation. */
export type NetbirdOpError = DefaultErrors | ConfigError | HttpClientError.HttpClientError;

/** Requirements shared by every generated NetBird operation. */
export type NetbirdOpContext = Credentials | HttpClient.HttpClient;

const errorEnvelope = (body: unknown): RestErrorEnvelope | undefined => {
	if (body === null || typeof body !== "object") return undefined;
	const record = body as Record<string, unknown>;
	const code = typeof record.code === "string" || typeof record.code === "number" ? record.code : undefined;
	const message = typeof record.message === "string" ? record.message : undefined;
	if (code === undefined && message === undefined) return undefined;
	return { ...(code !== undefined ? { code } : {}), ...(message !== undefined ? { message } : {}) };
};

/** Personal access tokens use the `Token` scheme; accept a pre-formatted header too. */
const authorization = (token: string): string =>
	token.startsWith("Token ") || token.startsWith("Bearer ") ? token : `Token ${token}`;

const restProtocol = makeRestProtocol<Config>({
	// Resolved on the CALLING fiber per request (the layer is memoized per
	// process); the Credentials service holds an effect, so a token rotated
	// between calls is picked up without rebuilding the layer.
	credentials: Effect.gen(function* () {
		const resolve = yield* Credentials;
		return yield* resolve;
	}),
	baseUrl: credentials => credentials.managementUrl,
	headers: credentials => ({ Authorization: authorization(Redacted.value(credentials.apiToken)) }),
	errorEnvelope,
	statusMap: HTTP_STATUS_MAP,
	unknownError: ({ code, message, body }) =>
		new UnknownNetbirdError({
			...(code !== undefined ? { code: String(code) } : {}),
			...(message ? { message } : {}),
			body,
		}),
	// Only raised when strict response validation is enabled; a 2xx body that
	// fails its schema surfaces as the parse error already in `ClientErrors`.
	parseError: ({ body, cause }) => new NetbirdParseError({ body, cause }),
});

/**
 * Self-hosted NetBird encodes empty collections as JSON `null` (Go nil
 * slices), which the REST protocol reads as an empty object. Hand list
 * responses back as an empty array so callers can iterate them.
 */
const emptyListForNullBody = (outputAst: AST.AST, value: unknown): unknown => {
	if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > 0) {
		return value;
	}
	return resolveNode(outputAst)._tag === "Arrays" ? [] : value;
};

export const NetbirdProtocol: Layer.Layer<API.Protocol> = Layer.effect(
	API.Protocol,
	Effect.gen(function* () {
		const base = yield* API.Protocol;
		return API.Protocol.of({
			encode: base.encode,
			decode: args => base.decode(args).pipe(Effect.map(value => emptyListForNullBody(args.outputAst, value))),
		});
	}),
).pipe(Layer.provide(restProtocol));
