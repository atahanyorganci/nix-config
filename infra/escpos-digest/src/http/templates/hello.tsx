import * as Schema from "effect/Schema";
import { Br, Cut, Image, Printer, Text } from "react-thermal-printer";
import { makeTemplate, readImageSync } from "../../thermal-printer.ts";

/** 200×80 black-on-white mark (circle + HI) for thermal preview. */
const Logo =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABQCAYAAABcbTqwAAAB8ElEQVR4Ae3BQW7DBhAEwZ4F///lSXzwIYAXtmVSooKuClAkfengX22R9F9JGCStBkmrQdJqkLQaJK0GSatB0mqQtBokrQZJq0HSapC0GiStBkmrQdJqkLQabi4J0qsc3EQSNkn4SlukKx28UBL+Igmf2iKd7eAFknC2JHxoi3SW4cmScKUkSGcZnigJz5AE6QwHT5CEZ0vCh7ZIjxouloRXSoL0qEHSarhQEu4gCdIjDi6ShDtJQlvOloRPbflOEj615VFJeFRb9DPDBZJwR0mQfmOQtDo4WRLuLAlteXdt+UoSPrVFfzNIWg2SVsOJkvAOkiD9xCBpNUhaHeg0SdD/yyBpNUhaHZwkCe8kCW05U1u+kwS9j+EkbXknbZG+M0haDZJWg6TVIGl1oLeUhO8k4Stt0c8MJ2rLO2iL9BODpNWB/qQtv9GWM7RF1xtO1pY7a4v0U4Ok1XCBttxRW6TfGC7Sljtpi/Rbw4XacgdtkR4xSFoNF2vLK7VFetTBE7TlQxKepS3SXw1P1JZnaIt0huHJ2nKltkhnOXiBtnxIwlnaIp3t4IXa8ikJv9UW6UoHN9GWryShLdIrDDfXFulVBkmrQdJqkLQaJK0GSatB0mqQtBokrQZJq0HSapC0GiStBkmrQdJqkLQKUCR96R+mdImsM2syOQAAAABJRU5ErkJggg==";

export const hello = makeTemplate({
	name: "hello",
	props: Schema.Struct({
		name: Schema.String,
	}),
	render: ({ name }) => (
		<Printer type="epson" width={42}>
			<Image src={Logo} align="center" reader={({ props: { src } }) => readImageSync(src)} />
			<Text align="center">Hello, {name}!</Text>
			<Br />
			<Cut />
		</Printer>
	),
});
