import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import { MinimumLogLevel } from "effect/References";

/** Apply `MinimumLogLevel` from Effect `Config` key `DEBUG` (default: false). */
export const withLogLevel = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E | Config.ConfigError, R> =>
	Effect.gen(function* () {
		const debug = yield* Config.boolean("DEBUG").pipe(Config.withDefault(false));
		return yield* effect.pipe(Effect.provideService(MinimumLogLevel, debug ? "Debug" : "Info"));
	});
