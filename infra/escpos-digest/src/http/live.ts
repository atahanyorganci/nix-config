import * as Effect from "effect/Effect";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import { UsbPrinter } from "../usb/print.ts";
import { Api, PrintError } from "./api.ts";

/** ESC/POS GS V 0 — full cut. */
const CutCommand = new Uint8Array([0x1d, 0x56, 0x00]);

const print = (data: Uint8Array) =>
	Effect.gen(function* () {
		const printer = yield* UsbPrinter;
		yield* printer.print(data).pipe(Effect.mapError(e => new PrintError({ reason: e })));
	});

export const live = HttpApiBuilder.group(Api, "api", handlers =>
	handlers
		.handle("health", () => Effect.succeed({ ok: true as const }))
		.handle("print", ({ payload }) => print(payload))
		.handle("cut", () => print(CutCommand)),
);
