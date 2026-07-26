import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as SchemaParser from "effect/SchemaParser";
import { UsbNativeError } from "./errors.ts";

/** Structural view of a node-usb device used at the schema boundary. */
export interface NativeUsbDevice {
	readonly vendorId: number;
	readonly productId: number;
	readonly deviceVersionMajor: number;
	readonly deviceVersionMinor: number;
	readonly deviceVersionSubminor: number;
	readonly usbVersionMajor: number;
	readonly usbVersionMinor: number;
	readonly usbVersionSubminor: number;
	readonly deviceClass: number;
	readonly deviceSubclass: number;
	readonly deviceProtocol: number;
	readonly bus: string;
	readonly address: number;
	readonly ports: ReadonlyArray<number>;
	readonly speed?: "low" | "full" | "high" | "super" | "superPlus";
	readonly handle: string;
	readonly manufacturerName: string | null;
	readonly productName: string | null;
	readonly serialNumber: string | null;
	readonly opened: boolean;
	readonly configuration: {
		readonly configurationValue: number;
		readonly configurationName: string | null;
		readonly interfaces: ReadonlyArray<{
			readonly interfaceNumber: number;
			readonly claimed: boolean;
			readonly alternate: {
				readonly alternateSetting: number;
				readonly interfaceClass: number;
				readonly interfaceSubclass: number;
				readonly interfaceProtocol: number;
				readonly interfaceName: string | null;
				readonly endpoints: ReadonlyArray<{
					readonly endpointNumber: number;
					readonly direction: "in" | "out";
					readonly type: "bulk" | "interrupt" | "isochronous";
					readonly packetSize: number;
				}>;
			};
			readonly alternates: ReadonlyArray<{
				readonly alternateSetting: number;
				readonly interfaceClass: number;
				readonly interfaceSubclass: number;
				readonly interfaceProtocol: number;
				readonly interfaceName: string | null;
				readonly endpoints: ReadonlyArray<{
					readonly endpointNumber: number;
					readonly direction: "in" | "out";
					readonly type: "bulk" | "interrupt" | "isochronous";
					readonly packetSize: number;
				}>;
			}>;
		}>;
	};
	readonly configurations: ReadonlyArray<NativeUsbDevice["configuration"]>;
}

const UsbSpeed = Schema.Literals(["low", "full", "high", "super", "superPlus"]);
const UsbDirection = Schema.Literals(["in", "out"]);
const UsbEndpointType = Schema.Literals(["bulk", "interrupt", "isochronous"]);

const UsbEndpoint = Schema.Struct({
	endpointNumber: Schema.Number,
	direction: UsbDirection,
	type: UsbEndpointType,
	packetSize: Schema.Number,
});

const UsbAlternateInterface = Schema.Struct({
	alternateSetting: Schema.Number,
	interfaceClass: Schema.Number,
	interfaceSubclass: Schema.Number,
	interfaceProtocol: Schema.Number,
	interfaceName: Schema.optional(Schema.String),
	endpoints: Schema.Array(UsbEndpoint),
});

const UsbInterface = Schema.Struct({
	interfaceNumber: Schema.Number,
	claimed: Schema.Boolean,
	alternate: UsbAlternateInterface,
	alternates: Schema.Array(UsbAlternateInterface),
});

const UsbConfiguration = Schema.Struct({
	configurationValue: Schema.Number,
	configurationName: Schema.optional(Schema.String),
	interfaces: Schema.Array(UsbInterface),
});

export const UsbDeviceRef = Schema.Struct({
	handle: Schema.String,
});
export type UsbDeviceRef = typeof UsbDeviceRef.Type;

export const UsbDevice = Schema.Struct({
	vendorId: Schema.Number,
	productId: Schema.Number,
	deviceVersionMajor: Schema.Number,
	deviceVersionMinor: Schema.Number,
	deviceVersionSubminor: Schema.Number,
	usbVersionMajor: Schema.Number,
	usbVersionMinor: Schema.Number,
	usbVersionSubminor: Schema.Number,
	deviceClass: Schema.Number,
	deviceSubclass: Schema.Number,
	deviceProtocol: Schema.Number,
	bus: Schema.String,
	address: Schema.Number,
	ports: Schema.Array(Schema.Number),
	speed: Schema.optional(UsbSpeed),
	handle: Schema.String,
	manufacturer: Schema.optional(Schema.String),
	product: Schema.optional(Schema.String),
	serialNumber: Schema.optional(Schema.String),
	opened: Schema.Boolean,
	configuration: UsbConfiguration,
	configurations: Schema.Array(UsbConfiguration),
});
export type UsbDevice = typeof UsbDevice.Type;

const NativeUsbDeviceSchema = Schema.declare(
	(u): u is NativeUsbDevice => typeof u === "object" && u !== null && "vendorId" in u && "productId" in u,
);

export const UsbDeviceFrom = NativeUsbDeviceSchema.pipe(
	Schema.decodeTo(UsbDevice, {
		decode: SchemaGetter.transform(
			(device): UsbDevice => ({
				vendorId: device.vendorId,
				productId: device.productId,
				deviceVersionMajor: device.deviceVersionMajor,
				deviceVersionMinor: device.deviceVersionMinor,
				deviceVersionSubminor: device.deviceVersionSubminor,
				usbVersionMajor: device.usbVersionMajor,
				usbVersionMinor: device.usbVersionMinor,
				usbVersionSubminor: device.usbVersionSubminor,
				deviceClass: device.deviceClass,
				deviceSubclass: device.deviceSubclass,
				deviceProtocol: device.deviceProtocol,
				bus: device.bus,
				address: device.address,
				ports: device.ports,
				...(device.speed != null ? { speed: device.speed } : {}),
				handle: device.handle,
				...(device.manufacturerName != null ? { manufacturer: device.manufacturerName } : {}),
				...(device.productName != null ? { product: device.productName } : {}),
				...(device.serialNumber != null ? { serialNumber: device.serialNumber } : {}),
				opened: device.opened,
				configuration: {
					configurationValue: device.configuration.configurationValue,
					...(device.configuration.configurationName != null
						? { configurationName: device.configuration.configurationName }
						: {}),
					interfaces: [...device.configuration.interfaces].map(iface => ({
						interfaceNumber: iface.interfaceNumber,
						claimed: iface.claimed,
						alternate: {
							alternateSetting: iface.alternate.alternateSetting,
							interfaceClass: iface.alternate.interfaceClass,
							interfaceSubclass: iface.alternate.interfaceSubclass,
							interfaceProtocol: iface.alternate.interfaceProtocol,
							...(iface.alternate.interfaceName != null ? { interfaceName: iface.alternate.interfaceName } : {}),
							endpoints: [...iface.alternate.endpoints].map(endpoint => ({
								endpointNumber: endpoint.endpointNumber,
								direction: endpoint.direction,
								type: endpoint.type,
								packetSize: endpoint.packetSize,
							})),
						},
						alternates: [...iface.alternates].map(alternate => ({
							alternateSetting: alternate.alternateSetting,
							interfaceClass: alternate.interfaceClass,
							interfaceSubclass: alternate.interfaceSubclass,
							interfaceProtocol: alternate.interfaceProtocol,
							...(alternate.interfaceName != null ? { interfaceName: alternate.interfaceName } : {}),
							endpoints: [...alternate.endpoints].map(endpoint => ({
								endpointNumber: endpoint.endpointNumber,
								direction: endpoint.direction,
								type: endpoint.type,
								packetSize: endpoint.packetSize,
							})),
						})),
					})),
				},
				configurations: [...device.configurations].map(configuration => ({
					configurationValue: configuration.configurationValue,
					...(configuration.configurationName != null ? { configurationName: configuration.configurationName } : {}),
					interfaces: [...configuration.interfaces].map(iface => ({
						interfaceNumber: iface.interfaceNumber,
						claimed: iface.claimed,
						alternate: {
							alternateSetting: iface.alternate.alternateSetting,
							interfaceClass: iface.alternate.interfaceClass,
							interfaceSubclass: iface.alternate.interfaceSubclass,
							interfaceProtocol: iface.alternate.interfaceProtocol,
							...(iface.alternate.interfaceName != null ? { interfaceName: iface.alternate.interfaceName } : {}),
							endpoints: [...iface.alternate.endpoints].map(endpoint => ({
								endpointNumber: endpoint.endpointNumber,
								direction: endpoint.direction,
								type: endpoint.type,
								packetSize: endpoint.packetSize,
							})),
						},
						alternates: [...iface.alternates].map(alternate => ({
							alternateSetting: alternate.alternateSetting,
							interfaceClass: alternate.interfaceClass,
							interfaceSubclass: alternate.interfaceSubclass,
							interfaceProtocol: alternate.interfaceProtocol,
							...(alternate.interfaceName != null ? { interfaceName: alternate.interfaceName } : {}),
							endpoints: [...alternate.endpoints].map(endpoint => ({
								endpointNumber: endpoint.endpointNumber,
								direction: endpoint.direction,
								type: endpoint.type,
								packetSize: endpoint.packetSize,
							})),
						})),
					})),
				})),
			}),
		),
		encode: SchemaGetter.forbidden<NativeUsbDevice, UsbDevice>(
			() => "UsbDevice -> NativeUsbDevice encoding is not supported",
		),
	}),
);

export const refFromDevice = (device: UsbDevice): UsbDeviceRef => ({
	handle: device.handle,
});

export const decodeNativeDeviceEffect = (device: NativeUsbDevice) =>
	SchemaParser.decodeEffect(UsbDeviceFrom)(device).pipe(
		Effect.mapError(cause => new UsbNativeError({ operation: "decodeDevice", cause })),
	);
