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

/** Printable width for 80mm thermal paper at 203 DPI. */
export const PAPER_WIDTH_PX = 576;

const isBlankPixel = (data: Uint8Array, width: number, x: number, y: number) => {
	const i = (y * width + x) * 4;
	const r = data[i]!;
	const g = data[i + 1]!;
	const b = data[i + 2]!;
	const a = data[i + 3]!;
	return a < 16 || (r + g + b) / 3 > 240;
};

export const trimPadding = (image: Image): Image => {
	const { data, width, height } = image;
	let minX = width;
	let minY = height;
	let maxX = 0;
	let maxY = 0;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (!isBlankPixel(data, width, x, y)) {
				minX = Math.min(minX, x);
				maxX = Math.max(maxX, x);
				minY = Math.min(minY, y);
				maxY = Math.max(maxY, y);
			}
		}
	}

	if (maxX < minX || maxY < minY) return image;

	const cropWidth = maxX - minX + 1;
	const cropHeight = maxY - minY + 1;
	if (cropWidth === width && cropHeight === height) return image;

	const output = new Uint8Array(cropWidth * cropHeight * 4);
	for (let y = 0; y < cropHeight; y++) {
		for (let x = 0; x < cropWidth; x++) {
			const srcIdx = ((minY + y) * width + (minX + x)) * 4;
			const dstIdx = (y * cropWidth + x) * 4;
			output[dstIdx] = data[srcIdx]!;
			output[dstIdx + 1] = data[srcIdx + 1]!;
			output[dstIdx + 2] = data[srcIdx + 2]!;
			output[dstIdx + 3] = data[srcIdx + 3]!;
		}
	}

	return { data: output, width: cropWidth, height: cropHeight };
};

export const prepareForPrint =
	(targetWidth: number) =>
	(image: Image): Image =>
		resizeToWidth(targetWidth)(trimPadding(image));

export const resizeToWidth =
	(targetWidth: number) =>
	(image: Image): Image => {
		if (image.width === targetWidth) return image;

		const targetHeight = Math.round((image.height * targetWidth) / image.width);
		const output = new Uint8Array(targetWidth * targetHeight * 4);

		for (let y = 0; y < targetHeight; y++) {
			const srcY = Math.min(image.height - 1, Math.floor((y * image.height) / targetHeight));
			for (let x = 0; x < targetWidth; x++) {
				const srcX = Math.min(image.width - 1, Math.floor((x * image.width) / targetWidth));
				const srcIdx = (srcY * image.width + srcX) * 4;
				const dstIdx = (y * targetWidth + x) * 4;
				output[dstIdx] = image.data[srcIdx]!;
				output[dstIdx + 1] = image.data[srcIdx + 1]!;
				output[dstIdx + 2] = image.data[srcIdx + 2]!;
				output[dstIdx + 3] = image.data[srcIdx + 3]!;
			}
		}

		return { data: output, width: targetWidth, height: targetHeight };
	};

export const PngDataUri = Schema.TemplateLiteralParser([
	"data:image/png;base64,",
	Schema.String.check(Schema.isNonEmpty(), Schema.isBase64()).pipe(
		Schema.decodeTo(Schema.Uint8Array, SchemaTransformation.uint8ArrayFromBase64String),
	),
]);

export const decodePng = Effect.fn(function* (pngFile: Uint8Array) {
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

export const readImage = Effect.fn(function* (src: string) {
	const [, pngFile] = yield* SchemaParser.decodeUnknownEffect(PngDataUri)(src).pipe(
		Effect.mapError(() => new InvalidUrlError({ url: src })),
	);

	return yield* decodePng(pngFile);
});

export const readImageSync = (src: string) => Effect.runPromise(readImage(src));
