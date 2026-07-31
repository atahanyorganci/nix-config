import { Br, Cut, Printer, Text, render } from "react-thermal-printer";

export const helloWorld = () =>
	render(
		<Printer type="epson" width={42}>
			<Text align="center">Hello World</Text>
			<Br />
			<Cut />
		</Printer>,
	);
