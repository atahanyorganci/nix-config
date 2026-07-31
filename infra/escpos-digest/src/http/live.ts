import * as Effect from "effect/Effect";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import { UsbPrinter } from "../usb/print.ts";
import { Api } from "./api.ts";
import { hello } from "./templates/hello.tsx";

/** ESC/POS GS V 0 — full cut. */
const CutCommand = new Uint8Array([0x1d, 0x56, 0x00]);

export const live = HttpApiBuilder.group(Api, "api", handlers =>
	handlers
		.handle("health", () => Effect.succeed({ ok: true as const }))
		.handle("print", ({ payload }) =>
			Effect.gen(function* () {
				const printer = yield* UsbPrinter;
				yield* printer.print(payload);
			}),
		)
		.handle("cut", () =>
			Effect.gen(function* () {
				const printer = yield* UsbPrinter;
				yield* printer.print(CutCommand);
			}),
		)
		.handle("templateHello", ({ payload: { name } }) =>
			Effect.gen(function* () {
				const data = yield* hello.render({ name }).pipe(Effect.orDie);
				const printer = yield* UsbPrinter;
				yield* printer.print(data);
			}),
		),
);
