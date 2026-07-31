import * as Effect from "effect/Effect";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import { UsbPrinter } from "../usb/print.ts";
import { Api, PrintError } from "./api.ts";

export const live = HttpApiBuilder.group(Api, "api", handlers =>
	handlers
		.handle("health", () => Effect.succeed({ ok: true as const }))
		.handle("print", ({ payload }) =>
			Effect.gen(function* () {
				const priner = yield* UsbPrinter;
				yield* priner.print(payload).pipe(Effect.mapError(e => new PrintError({ reason: e })));
			}),
		),
);
