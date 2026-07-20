import { makeAPI } from "@distilled.cloud/core/client";
import { parseRetryAfterForStatus } from "@distilled.cloud/core/retry-after";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import { Credentials } from "./credentials.ts";
import { HTTP_STATUS_MAP, NetbirdParseError, UnknownNetbirdError } from "./errors.ts";
import { Retry } from "./retry.ts";

export { UnknownNetbirdError } from "./errors.ts";

const ApiErrorResponse = Schema.Struct({
	// Self-hosted NetBird returns numeric `code` (e.g. 404); cloud may use strings.
	code: Schema.optional(Schema.Union([Schema.String, Schema.Number])),
	message: Schema.String,
});

const matchError = (
	status: number,
	errorBody: unknown,
	_errors?: readonly unknown[],
	headers?: Record<string, string | undefined>,
): Effect.Effect<never, unknown> => {
	try {
		const parsed = Schema.decodeUnknownSync(ApiErrorResponse)(errorBody);
		const ErrorClass = (HTTP_STATUS_MAP as any)[status];
		if (ErrorClass) {
			return Effect.fail(
				new ErrorClass({
					message: parsed.message ?? "",
					retryAfter: parseRetryAfterForStatus(status, headers),
				}),
			);
		}
		let code: string | undefined;
		if (parsed.code === undefined) {
			code = undefined;
		} else if (typeof parsed.code === "string") {
			code = parsed.code;
		} else {
			code = String(parsed.code);
		}
		return Effect.fail(
			new UnknownNetbirdError({
				code,
				message: parsed.message,
				body: errorBody,
			}),
		);
	} catch {
		return Effect.fail(new UnknownNetbirdError({ body: errorBody }));
	}
};

const tokenHeaderValue = (token: string): string =>
	token.startsWith("Token ") || token.startsWith("Bearer ") ? token : `Token ${token}`;

export const API = makeAPI<Credentials>({
	credentials: Credentials as any,
	getBaseUrl: (creds: any) => creds.apiBaseUrl,
	getAuthHeaders: (creds: any) => ({
		Authorization: tokenHeaderValue(Redacted.value(creds.apiToken)),
	}),
	matchError,
	ParseError: NetbirdParseError as any,
	retry: Retry as any,
});
