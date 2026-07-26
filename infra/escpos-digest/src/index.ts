import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";

const program = Effect.gen(function* () {
	yield* Console.log("Hello, world!");
});

program.pipe(BunRuntime.runMain);
