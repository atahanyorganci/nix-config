import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
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
