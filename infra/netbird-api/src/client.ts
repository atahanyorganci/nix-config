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
	code: Schema.optional(Schema.String),
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
		return Effect.fail(
			new UnknownNetbirdError({
				code: parsed.code,
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
