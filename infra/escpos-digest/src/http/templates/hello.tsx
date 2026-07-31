import * as Schema from "effect/Schema";
import { Br, Cut, Printer, Text } from "react-thermal-printer";
import { makeTemplate } from "../../thermal-printer.ts";

export const hello = makeTemplate({
	name: "hello",
	props: Schema.Struct({
		name: Schema.String,
	}),
	render: ({ name }) => (
		<Printer type="epson" width={42}>
			<Text align="center">Hello, {name}!</Text>
			<Br />
			<Cut />
		</Printer>
	),
});
