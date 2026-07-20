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
export type { DefaultErrors } from "@distilled.cloud/core/errors";

import * as Category from "@distilled.cloud/core/category";
import * as Schema from "effect/Schema";

export class UnknownHetznerError extends Schema.TaggedErrorClass<UnknownHetznerError>()("UnknownHetznerError", {
	code: Schema.optional(Schema.String),
	message: Schema.optional(Schema.String),
	body: Schema.Unknown,
}).pipe(Category.withServerError) {}

export class HetznerParseError extends Schema.TaggedErrorClass<HetznerParseError>()("HetznerParseError", {
	body: Schema.Unknown,
	cause: Schema.Unknown,
}).pipe(Category.withParseError) {}
