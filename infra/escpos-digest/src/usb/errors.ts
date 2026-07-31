import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import type { UsbDeviceRef } from "./device.ts";

export class DeviceNotFound extends Data.TaggedError("DeviceNotFound")<{
	readonly ref: UsbDeviceRef;
}> {}

export class PrinterNotFound extends Data.TaggedError("PrinterNotFound")<{
	readonly vendorId: number;
	readonly productId: number;
}> {}

export class NoBulkOutEndpoint extends Data.TaggedError("NoBulkOutEndpoint")<{
	readonly vendorId: number;
	readonly productId: number;
}> {}

export class OpenFailed extends Data.TaggedError("OpenFailed")<{
	readonly ref: UsbDeviceRef;
	readonly cause: unknown;
}> {}

export class ClaimFailed extends Data.TaggedError("ClaimFailed")<{
	readonly ref: UsbDeviceRef;
	readonly interfaceNumber: number;
	readonly cause: unknown;
}> {}

export class TransferFailed extends Data.TaggedError("TransferFailed")<{
	readonly direction: "in" | "out";
	readonly endpointNumber: number;
	readonly cause: unknown;
}> {}

export class UsbNativeError extends Data.TaggedError("UsbNativeError")<{
	readonly operation: string;
	readonly cause: unknown;
}> {}

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
