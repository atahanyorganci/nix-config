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
	message: Schema.optional(Schema.String),
});

const matchError = Effect.fnUntraced(function* (
	status: number,
	errorBody: unknown,
	_errors?: readonly unknown[],
	headers?: Record<string, string | undefined>,
) {
	const retryAfter = parseRetryAfterForStatus(status, headers);
	const ErrorClass = (HTTP_STATUS_MAP as any)[status];

	const parsed = yield* Schema.decodeUnknownEffect(ApiErrorResponse)(errorBody).pipe(
		Effect.map(parsed => {
			const result: { code?: string; message?: string } = {};
			if (parsed.code !== undefined) {
				result.code = typeof parsed.code === "string" ? parsed.code : String(parsed.code);
			}
			if (parsed.message !== undefined) {
				result.message = parsed.message;
			}
			return result;
		}),
		Effect.orElseSucceed((): { code?: string; message?: string } | undefined => {
			if (typeof errorBody !== "object" || errorBody === null || !("_nonJsonError" in errorBody)) {
				return undefined;
			}
			const body = (errorBody as { body?: unknown }).body;
			if (typeof body !== "string" || body.length === 0) {
				return undefined;
			}
			return { message: body };
		}),
	);

	if (ErrorClass) {
		return yield* Effect.fail(
			new ErrorClass({
				message: parsed?.message ?? "",
				retryAfter,
			}),
		);
	}

	if (parsed) {
		const error: { body: unknown; code?: string; message?: string } = { body: errorBody };
		if (parsed.code !== undefined) {
			error.code = parsed.code;
		}
		if (parsed.message !== undefined) {
			error.message = parsed.message;
		}
		return yield* Effect.fail(new UnknownNetbirdError(error));
	}

	return yield* Effect.fail(new UnknownNetbirdError({ body: errorBody }));
});

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
