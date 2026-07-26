import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Usb from "./usb.ts";

const program = Effect.gen(function* () {
	const usb = yield* Usb.Usb;

	const devices = yield* usb.listDevices();
	for (const device of devices) {
		yield* Console.log(JSON.stringify(device, null, 2));
	}
});

program.pipe(Effect.provide(Usb.layer), BunRuntime.runMain);
