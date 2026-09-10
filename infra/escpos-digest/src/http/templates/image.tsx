import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { Br, Cut, Image, Printer } from "react-thermal-printer";
import { PaperConfig } from "../../paper.ts";
import {
	decodePng,
	type Image as PrinterImage,
	prepareForPrint,
	PngDataUri,
	readImage,
	render,
} from "../../thermal-printer.ts";

export const imageProps = Schema.Struct({
	src: PngDataUri,
});

const imageReceipt = (image: PrinterImage, paperWidthPx: number) => (
	<Printer type="epson">
		<Image
			src="inline://image"
			reader={() => Promise.resolve(image)}
			transforms={[prepareForPrint(paperWidthPx)]}
		/>
		<Br />
		<Cut />
	</Printer>
);

export const renderFromPngBytes = (bytes: Uint8Array) =>
	Effect.gen(function* () {
		const { widthPx } = yield* PaperConfig;
		const decoded = yield* decodePng(bytes);
		return yield* render(imageReceipt(decoded, widthPx));
	});

export const renderFromSrc = (src: Schema.Schema.Type<typeof PngDataUri>) =>
	Effect.gen(function* () {
		const { widthPx } = yield* PaperConfig;
		const decoded = yield* readImage(Schema.encodeSync(PngDataUri)(src));
		return yield* render(imageReceipt(decoded, widthPx));
	});
