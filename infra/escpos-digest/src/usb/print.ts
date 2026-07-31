import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Semaphore from "effect/Semaphore";
import { usb } from "usb";
import { NoBulkOutEndpoint, PrinterNotFound, tryNative, type UsbError } from "./errors.ts";

export class UsbPrinter extends Context.Service<
	UsbPrinter,
	{
		readonly print: (data: Uint8Array) => Effect.Effect<void, UsbError>;
	}
>()("UsbPrinter") {}

export type PrinterConfig = {
	readonly vendorId: number;
	readonly productId: number;
};

export const fromConfig = (config: PrinterConfig): Layer.Layer<UsbPrinter> =>
	Layer.effect(
		UsbPrinter,
		Effect.gen(function* () {
			const semaphore = yield* Semaphore.make(1);
			return {
				print: (data: Uint8Array) => semaphore.withPermits(1)(printOnce(config, data)),
			};
		}),
	);

type NativeDevice = NonNullable<Awaited<ReturnType<typeof usb.findDeviceByIds>>>;

type BulkOut = {
	readonly interfaceNumber: number;
	readonly endpointNumber: number;
};

const findBulkOut = (config: PrinterConfig, device: NativeDevice): Effect.Effect<BulkOut, UsbError> =>
	Effect.gen(function* () {
		for (const iface of device.configuration.interfaces) {
			for (const ep of iface.alternate.endpoints) {
				if (ep.direction === "out" && ep.type === "bulk") {
					return { interfaceNumber: iface.interfaceNumber, endpointNumber: ep.endpointNumber };
				}
			}
		}
		return yield* Effect.fail(new NoBulkOutEndpoint(config));
	});

const openDevice = (config: PrinterConfig) =>
	Effect.gen(function* () {
		const device = yield* tryNative("findDeviceByIds", () => usb.findDeviceByIds(config.vendorId, config.productId));
		if (device === undefined) {
			return yield* Effect.fail(new PrinterNotFound(config));
		}
		yield* tryNative("open", () => device.open());
		return device;
	});

const printOnce = (config: PrinterConfig, data: Uint8Array): Effect.Effect<void, UsbError> =>
	Effect.acquireUseRelease(
		openDevice(config),
		device =>
			Effect.gen(function* () {
				const bulk = yield* findBulkOut(config, device);
				yield* tryNative("detachKernelDriver", () => device.detachKernelDriver(bulk.interfaceNumber)).pipe(
					Effect.ignore,
				);
				yield* Effect.acquireUseRelease(
					tryNative("claimInterface", () => device.claimInterface(bulk.interfaceNumber)),
					() =>
						tryNative("transferOut", () => device.nativeTransferOut(bulk.endpointNumber, 5000, data)).pipe(
							Effect.asVoid,
						),
					() =>
						tryNative("releaseInterface", () => device.releaseInterface(bulk.interfaceNumber)).pipe(
							Effect.andThen(
								tryNative("attachKernelDriver", () => device.attachKernelDriver(bulk.interfaceNumber)).pipe(
									Effect.ignore,
								),
							),
						),
				);
			}),
		device => tryNative("close", () => device.close()),
	);
