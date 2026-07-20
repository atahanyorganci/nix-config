import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import type { NotFound } from "@yorganci/hetzner-api/Errors";

export const isNotFound = (error: unknown): error is InstanceType<typeof NotFound> =>
	Predicate.hasProperty(error, "_tag") && error._tag === "NotFound";

/** Swallow Hetzner 404s when the typed op union omits `NotFound`. */
export const catchNotFound = <A, E, R>(
	effect: Effect.Effect<A, E, R>,
): Effect.Effect<A | undefined, Exclude<E, InstanceType<typeof NotFound>>, R> =>
	effect.pipe(Effect.catchIf(isNotFound, () => Effect.succeed(undefined))) as Effect.Effect<
		A | undefined,
		Exclude<E, InstanceType<typeof NotFound>>,
		R
	>;
