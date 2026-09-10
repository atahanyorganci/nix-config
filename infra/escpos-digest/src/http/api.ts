import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import * as HttpApiSchema from "effect/unstable/httpapi/HttpApiSchema";
import {
	InvalidUrlError,
	NoImageReaderError,
	PngDecodeError,
	RenderError,
} from "../thermal-printer.ts";
import {
	ClaimFailed,
	DeviceNotFound,
	NoBulkOutEndpoint,
	OpenFailed,
	PrinterNotFound,
	TransferFailed,
	UsbNativeError,
} from "../usb/errors.ts";
import { hello } from "./templates/hello.tsx";
import { imageProps } from "./templates/image.tsx";

const HealthOk = Schema.Struct({ ok: Schema.Literal(true) });

/** Max base64 request body size (256 KiB). */
const MaxBase64Bytes = 256 * 1024;
/** Max decoded ESC/POS payload size (192 KiB). */
const MaxPayloadBytes = 192 * 1024;
/** Max raw PNG upload size (4 MiB). */
const MaxPngBytes = 4 * 1024 * 1024;

const PngPayload = Schema.Uint8Array.check(
	Schema.isNonEmpty({ message: "PNG body must not be empty" }),
	Schema.isMaxLength(MaxPngBytes, { message: `PNG body exceeds ${MaxPngBytes} bytes` }),
);

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
			error: [
				HttpApiError.BadRequest,
				DeviceNotFound,
				PrinterNotFound,
				NoBulkOutEndpoint,
				OpenFailed,
				ClaimFailed,
				TransferFailed,
				UsbNativeError,
			],
		}),
		HttpApiEndpoint.post("cut", "/cut", {
			success: HttpApiSchema.NoContent,
			error: [
				HttpApiError.BadRequest,
				DeviceNotFound,
				PrinterNotFound,
				NoBulkOutEndpoint,
				OpenFailed,
				ClaimFailed,
				TransferFailed,
				UsbNativeError,
			],
		}),
		HttpApiEndpoint.post("templateHello", "/template/hello", {
			payload: hello.props,
			success: HttpApiSchema.NoContent,
			error: [
				HttpApiError.BadRequest,
				InvalidUrlError,
				PngDecodeError,
				RenderError,
				NoImageReaderError,
				DeviceNotFound,
				PrinterNotFound,
				NoBulkOutEndpoint,
				OpenFailed,
				ClaimFailed,
				TransferFailed,
				UsbNativeError,
			],
		}),
		HttpApiEndpoint.post("templateImage", "/template/image", {
			payload: imageProps,
			success: HttpApiSchema.NoContent,
			error: [
				HttpApiError.BadRequest,
				InvalidUrlError,
				PngDecodeError,
				RenderError,
				NoImageReaderError,
				DeviceNotFound,
				PrinterNotFound,
				NoBulkOutEndpoint,
				OpenFailed,
				ClaimFailed,
				TransferFailed,
				UsbNativeError,
			],
		}),
		HttpApiEndpoint.post("templateImageRaw", "/template/image/raw", {
			payload: PngPayload.pipe(HttpApiSchema.asUint8Array({ contentType: "image/png" })),
			success: HttpApiSchema.NoContent,
			error: [
				HttpApiError.BadRequest,
				PngDecodeError,
				RenderError,
				NoImageReaderError,
				DeviceNotFound,
				PrinterNotFound,
				NoBulkOutEndpoint,
				OpenFailed,
				ClaimFailed,
				TransferFailed,
				UsbNativeError,
			],
		}),
	),
);
