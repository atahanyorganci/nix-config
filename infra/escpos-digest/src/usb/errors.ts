import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** Inline to avoid a device ↔ errors import cycle. */
const UsbDeviceRef = Schema.Struct({
	handle: Schema.String,
});

export class DeviceNotFound extends Schema.TaggedErrorClass<DeviceNotFound>()(
	"DeviceNotFound",
	{
		ref: UsbDeviceRef,
	},
	{ httpApiStatus: 404 },
) {}

export class PrinterNotFound extends Schema.TaggedErrorClass<PrinterNotFound>()(
	"PrinterNotFound",
	{
		vendorId: Schema.Number,
		productId: Schema.Number,
	},
	{ httpApiStatus: 404 },
) {}

export class NoBulkOutEndpoint extends Schema.TaggedErrorClass<NoBulkOutEndpoint>()(
	"NoBulkOutEndpoint",
	{
		vendorId: Schema.Number,
		productId: Schema.Number,
	},
	{ httpApiStatus: 500 },
) {}

export class OpenFailed extends Schema.TaggedErrorClass<OpenFailed>()(
	"OpenFailed",
	{
		ref: UsbDeviceRef,
		cause: Schema.Unknown,
	},
	{ httpApiStatus: 500 },
) {}

export class ClaimFailed extends Schema.TaggedErrorClass<ClaimFailed>()(
	"ClaimFailed",
	{
		ref: UsbDeviceRef,
		interfaceNumber: Schema.Number,
		cause: Schema.Unknown,
	},
	{ httpApiStatus: 500 },
) {}

export class TransferFailed extends Schema.TaggedErrorClass<TransferFailed>()(
	"TransferFailed",
	{
		direction: Schema.Literals(["in", "out"]),
		endpointNumber: Schema.Number,
		cause: Schema.Unknown,
	},
	{ httpApiStatus: 500 },
) {}

export class UsbNativeError extends Schema.TaggedErrorClass<UsbNativeError>()(
	"UsbNativeError",
	{
		operation: Schema.String,
		cause: Schema.Unknown,
	},
	{ httpApiStatus: 500 },
) {}

export type UsbError =
	| DeviceNotFound
	| PrinterNotFound
	| NoBulkOutEndpoint
	| OpenFailed
	| ClaimFailed
	| TransferFailed
	| UsbNativeError;

export const tryNative = <A>(operation: string, fn: () => Promise<A>) =>
	Effect.tryPromise({
		try: fn,
		catch: cause => new UsbNativeError({ operation, cause }),
	});
