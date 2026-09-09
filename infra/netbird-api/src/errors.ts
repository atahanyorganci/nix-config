/**
 * NetBird-specific error types.
 *
 * Re-exports the shared HTTP errors from distilled core and adds the
 * unknown-error and parse-error wrappers. NetBird's error envelope is
 * `{ message, code }` at the top level; the self-hosted server returns a
 * numeric `code` (the HTTP status), NetBird Cloud may return strings.
 */
export {
	BadGateway,
	BadRequest,
	Conflict,
	ConfigError,
	Forbidden,
	GatewayTimeout,
	InternalServerError,
	Locked,
	NotFound,
	ServiceUnavailable,
	TooManyRequests,
	Unauthorized,
	UnprocessableEntity,
	HTTP_STATUS_MAP,
	DEFAULT_ERRORS,
	API_ERRORS,
} from "@distilled.cloud/core/errors";
import * as Category from "@distilled.cloud/core/category";
import * as Schema from "effect/Schema";
import type {
	BadRequest as CoreBadRequest,
	Conflict as CoreConflict,
	DefaultErrors as CoreDefaultErrors,
	Forbidden as CoreForbidden,
	Locked as CoreLocked,
	NotFound as CoreNotFound,
	UnprocessableEntity as CoreUnprocessableEntity,
} from "@distilled.cloud/core/errors";

/** A failed response whose HTTP status has no mapped error class. */
export class UnknownNetbirdError extends Schema.TaggedError<UnknownNetbirdError>()("UnknownNetbirdError", {
	code: Schema.optional(Schema.String),
	message: Schema.optional(Schema.String),
	body: Schema.Unknown,
}).pipe(Category.withServerError) {}

/** Schema parse error wrapper. */
export class NetbirdParseError extends Schema.TaggedError<NetbirdParseError>()("NetbirdParseError", {
	body: Schema.Unknown,
	cause: Schema.Unknown,
}).pipe(Category.withParseError) {}

export type ClientErrors = UnknownNetbirdError | NetbirdParseError;

/**
 * Errors any NetBird operation may surface. Every operation carries the whole
 * set: a self-hosted server answers with statuses the OpenAPI document does
 * not declare per operation, so the error channel says so up front.
 */
export type DefaultErrors =
	| CoreDefaultErrors
	| CoreBadRequest
	| CoreForbidden
	| CoreNotFound
	| CoreConflict
	| CoreUnprocessableEntity
	| CoreLocked
	| ClientErrors;
