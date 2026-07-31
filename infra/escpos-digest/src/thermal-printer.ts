import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaParser from "effect/SchemaParser";
import * as SchemaTransformation from "effect/SchemaTransformation";
import { PNG } from "pngjs";
import * as ReactThermalPrinter from "react-thermal-printer";

type RenderParams = Parameters<typeof ReactThermalPrinter.render>;
export type PrinterElement = RenderParams[0];
export type RenderOptions = RenderParams[1];

export class NoImageReaderError extends Schema.TaggedErrorClass<NoImageReaderError>()(
	"NoImageReaderError",
	{
		message: Schema.String,
	},
	{ httpApiStatus: 500 },
) {}

export class RenderError extends Schema.TaggedErrorClass<RenderError>()(
	"RenderError",
	{
		message: Schema.String,
	},
	{ httpApiStatus: 500 },
) {}

export const render = (elem: PrinterElement, options?: RenderOptions) =>
	Effect.tryPromise({
		try: () => ReactThermalPrinter.render(elem, options),
		catch(error) {
			console.error(error);
			if (error instanceof ReferenceError && error.message.includes("Image")) {
				return new NoImageReaderError({ message: error.message });
			}
			if (error instanceof Error) {
				return new RenderError({ message: error.message });
			}
			return new RenderError({ message: "Unknown error" });
		},
	});

export const makeTemplate = <A>(options: {
	name: string;
	props: Schema.Schema<A>;
	render: (props: A) => PrinterElement;
}) => ({
	name: options.name,
	props: options.props,
	render: (props: A, renderOptions?: RenderOptions) => render(options.render(props), renderOptions),
});

export class InvalidUrlError extends Schema.TaggedErrorClass<InvalidUrlError>()(
	"InvalidUrlError",
	{
		url: Schema.String,
	},
	{ httpApiStatus: 400 },
) {}

export class PngDecodeError extends Schema.TaggedErrorClass<PngDecodeError>()(
	"PngDecodeError",
	{
		cause: Schema.Unknown,
	},
	{ httpApiStatus: 500 },
) {}

export interface Image {
	readonly data: Uint8Array;
	readonly width: number;
	readonly height: number;
}

const PngDataUri = Schema.TemplateLiteralParser([
	"data:image/png;base64,",
	Schema.String.check(Schema.isNonEmpty(), Schema.isBase64()).pipe(
		Schema.decodeTo(Schema.Uint8Array, SchemaTransformation.uint8ArrayFromBase64String),
	),
]);

export const readImage = Effect.fn(function* (src: string) {
	const [, pngFile] = yield* SchemaParser.decodeUnknownEffect(PngDataUri)(src).pipe(
		Effect.mapError(() => new InvalidUrlError({ url: src })),
	);

	const png = yield* Effect.try({
		try: () => PNG.sync.read(Buffer.from(pngFile)),
		catch: cause => new PngDecodeError({ cause }),
	});

	return {
		data: new Uint8Array(png.data),
		width: png.width,
		height: png.height,
	} satisfies Image;
});

export const readImageSync = (src: string) => Effect.runPromise(readImage(src));
