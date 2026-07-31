import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import * as Effect from "effect/Effect";
import * as Encoding from "effect/Encoding";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SchemaIssue from "effect/SchemaIssue";
import * as SchemaParser from "effect/SchemaParser";
import * as SchemaTransformation from "effect/SchemaTransformation";
import * as CliError from "effect/unstable/cli/CliError";
import * as Command from "effect/unstable/cli/Command";
import * as Flag from "effect/unstable/cli/Flag";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as Http from "./http/index.ts";
import * as UsbPrinter from "./usb/print.ts";

const UsbIdFromString = Schema.String.pipe(
	Schema.decodeTo(
		Schema.Number,
		SchemaTransformation.transformOrFail({
			decode: input => {
				const hex = input.startsWith("0x") || input.startsWith("0X") ? input.slice(2) : input;
				const padded = hex.length % 2 === 1 ? `0${hex}` : hex;
				return Effect.fromResult(Encoding.decodeHex(padded)).pipe(
					Effect.map(bytes => bytes.reduce((acc, b) => (acc << 8) | b, 0)),
					Effect.mapError(e => new SchemaIssue.InvalidValue(Option.some(input), { message: e.message })),
				);
			},
			encode: n => Effect.succeed(`0x${Encoding.encodeHex(new Uint8Array([(n >> 8) & 0xff, n & 0xff]))}`),
		}),
	),
);

const usbIdFlag = (name: string) =>
	Flag.string(name).pipe(
		Flag.mapEffect(raw =>
			SchemaParser.decodeEffect(UsbIdFromString)(raw).pipe(
				Effect.mapError(
					() =>
						new CliError.InvalidValue({
							option: name,
							value: raw,
							expected: "USB id (decimal or 0x hex)",
							kind: "flag",
						}),
				),
			),
		),
	);

const serve = Command.make(
	"serve",
	{
		hostname: Flag.string("hostname").pipe(Flag.withDefault("127.0.0.1")),
		port: Flag.integer("port").pipe(Flag.withDefault(8080)),
		vendorId: usbIdFlag("vendor-id"),
		productId: usbIdFlag("product-id"),
	},
	({ hostname, port, vendorId, productId }) =>
		Layer.launch(
			HttpRouter.serve(HttpApiBuilder.layer(Http.Api)).pipe(
				Layer.provide(Http.live),
				Layer.provide(UsbPrinter.fromConfig({ vendorId, productId })),
				Layer.provide(BunHttpServer.layer({ hostname, port })),
			),
		),
);

const program = Command.run(serve, { version: "0.0.0" }).pipe(
	Effect.provide(BunServices.layer),
	Effect.scoped,
	Effect.orDie,
);

BunRuntime.runMain(program as Effect.Effect<void>);
