import { makeAPI } from "@distilled.cloud/core/client";
import { parseRetryAfterForStatus } from "@distilled.cloud/core/retry-after";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import { Credentials } from "./credentials.ts";
import { HTTP_STATUS_MAP, HetznerParseError, UnknownHetznerError } from "./errors.ts";
import { Retry } from "./retry.ts";

export { UnknownHetznerError } from "./errors.ts";

const ApiErrorResponse = Schema.Struct({
	error: Schema.Struct({
		code: Schema.String,
		message: Schema.String,
		details: Schema.optional(Schema.Unknown),
	}),
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
					message: parsed.error.message ?? "",
					retryAfter: parseRetryAfterForStatus(status, headers),
				}),
			);
		}
		return Effect.fail(
			new UnknownHetznerError({
				code: parsed.error.code,
				message: parsed.error.message,
				body: errorBody,
			}),
		);
	} catch {
		return Effect.fail(new UnknownHetznerError({ body: errorBody }));
	}
};

const tokenHeaderValue = (token: string): string => (token.startsWith("Bearer ") ? token : `Bearer ${token}`);

export const API = makeAPI<Credentials>({
	credentials: Credentials as any,
	getBaseUrl: (creds: any) => creds.apiBaseUrl,
	getAuthHeaders: (creds: any) => ({
		Authorization: tokenHeaderValue(Redacted.value(creds.apiToken)),
	}),
	matchError,
	ParseError: HetznerParseError as any,
	retry: Retry as any,
});
