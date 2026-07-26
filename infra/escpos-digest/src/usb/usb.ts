import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { usb } from "usb";
import { decodeNativeDeviceEffect, type UsbDevice, type UsbDeviceRef } from "./device.ts";
import { DeviceNotFound, tryNative, type UsbError } from "./errors.ts";

type LiveNativeUsbDevice = Awaited<ReturnType<typeof usb.getDevices>>[number];

const makeRegistry = () => {
	const byHandle = new Map<string, LiveNativeUsbDevice>();

	const sync = tryNative("getDevices", () => usb.getDevices()).pipe(
		Effect.tap(devices =>
			Effect.sync(() => {
				byHandle.clear();
				for (const device of devices) {
					byHandle.set(device.handle, device);
				}
			}),
		),
		Effect.map(() => undefined),
	);

	const values = () => [...byHandle.values()];

	const resolve = (ref: UsbDeviceRef) =>
		Effect.gen(function* () {
			yield* sync;
			const native = byHandle.get(ref.handle);
			if (native === undefined) {
				return yield* Effect.fail(new DeviceNotFound({ ref }));
			}
			return native;
		});

	return { sync, values, resolve };
};

export class Usb extends Context.Service<
	Usb,
	{
		readonly listDevices: () => Effect.Effect<UsbDevice[], UsbError>;
		readonly findByVidPid: (vendorId: number, productId: number) => Effect.Effect<Option.Option<UsbDevice>, UsbError>;
		readonly findBySerial: (serialNumber: string) => Effect.Effect<Option.Option<UsbDevice>, UsbError>;
	}
>()("Usb") {}

/**
 * Live USB bus layer.
 *
 * On Linux, ESC/POS printers may need `detachKernelDriver(interfaceNumber)` before
 * `claimInterface`. Auto-detach is not implemented in v1 — call it manually if claim fails.
 */
export const UsbLive = Layer.sync(Usb, () => {
	const registry = makeRegistry();

	return {
		listDevices: () =>
			Effect.gen(function* () {
				yield* registry.sync;
				return yield* Effect.forEach(registry.values(), decodeNativeDeviceEffect);
			}),
		findByVidPid: (vendorId, productId) =>
			Effect.gen(function* () {
				const native = yield* tryNative("findDeviceByIds", () => usb.findDeviceByIds(vendorId, productId));
				if (native === undefined) {
					return Option.none();
				}
				return Option.some(yield* decodeNativeDeviceEffect(native));
			}),
		findBySerial: serialNumber =>
			Effect.gen(function* () {
				const native = yield* tryNative("findDeviceBySerial", () => usb.findDeviceBySerial(serialNumber));
				if (native === undefined) {
					return Option.none();
				}
				return Option.some(yield* decodeNativeDeviceEffect(native));
			}),
	};
});

export const layer = UsbLive;
