import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import * as HttpApiSchema from "effect/unstable/httpapi/HttpApiSchema";

export class PrintError extends Schema.TaggedErrorClass<PrintError>()(
	"PrinterError",
	{
		reason: Schema.Unknown,
	},
	{
		description: "USB print failed",
		httpApiStatus: 500,
	},
) {}

const HealthOk = Schema.Struct({ ok: Schema.Literal(true) });

/** Max base64 request body size (256 KiB). */
const MaxBase64Bytes = 256 * 1024;
/** Max decoded ESC/POS payload size (192 KiB). */
const MaxPayloadBytes = 192 * 1024;

const PrintPayload = Schema.String.check(
	Schema.isNonEmpty({ message: "print body must not be empty" }),
	Schema.isTrimmed({ message: "print body must not have leading or trailing whitespace" }),
	Schema.isBase64({ message: "print body must be valid base64" }),
	Schema.isMaxLength(MaxBase64Bytes, { message: `print body exceeds ${MaxBase64Bytes} bytes` }),
).pipe(
	Schema.decodeTo(
		Schema.Uint8Array.check(
			Schema.isNonEmpty({ message: "decoded ESC/POS payload must not be empty" }),
			Schema.isMaxLength(MaxPayloadBytes, { message: `decoded ESC/POS payload exceeds ${MaxPayloadBytes} bytes` }),
		),
		SchemaTransformation.uint8ArrayFromBase64String,
	),
);

export const Api = HttpApi.make("EscposDigest").add(
	HttpApiGroup.make("api", { topLevel: true }).add(
		HttpApiEndpoint.get("health", "/health", {
			success: HealthOk,
		}),
		HttpApiEndpoint.post("print", "/print", {
			payload: PrintPayload.pipe(HttpApiSchema.asText()),
			success: HttpApiSchema.NoContent,
			error: [HttpApiError.BadRequest, PrintError],
		}),
		HttpApiEndpoint.post("cut", "/cut", {
			success: HttpApiSchema.NoContent,
			error: PrintError,
		}),
	),
);
