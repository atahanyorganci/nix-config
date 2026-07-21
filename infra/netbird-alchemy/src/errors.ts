import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import type { NotFound } from "@yorganci/netbird-api/Errors";

export const isNotFound = (error: unknown): error is InstanceType<typeof NotFound> =>
	Predicate.hasProperty(error, "_tag") && error._tag === "NotFound";

export const isTransportError = (error: unknown) =>
	(Predicate.hasProperty(error, "_tag") && error._tag === "HttpClientError") ||
	(error instanceof Error && error.name === "HttpClientError" && error.message.startsWith("Transport error"));

/** Swallow transport failures when the control plane is unreachable (e.g. during destroy). */
export const catchUnavailable = <A, E, R>(
	effect: Effect.Effect<A, E, R>,
): Effect.Effect<A | undefined, Exclude<E, never>, R> =>
	effect.pipe(Effect.catchIf(isTransportError, () => Effect.succeed(undefined))) as Effect.Effect<
		A | undefined,
		Exclude<E, never>,
		R
	>;

/** Swallow NetBird 404s when the typed op union omits `NotFound`. */
export const catchNotFound = <A, E, R>(
	effect: Effect.Effect<A, E, R>,
): Effect.Effect<A | undefined, Exclude<E, InstanceType<typeof NotFound>>, R> =>
	effect.pipe(Effect.catchIf(isNotFound, () => Effect.succeed(undefined))) as Effect.Effect<
		A | undefined,
		Exclude<E, InstanceType<typeof NotFound>>,
		R
	>;

/**
 * A self-hosted NetBird control plane can be deleted with its backing server.
 * In that case, a transport failure on a child-resource delete means the
 * resource is already physically gone with the server's database.
 */
export const catchNotFoundOrUnavailable = <A, E, R>(
	effect: Effect.Effect<A, E, R>,
): Effect.Effect<A | undefined, Exclude<E, InstanceType<typeof NotFound>>, R> =>
	effect.pipe(
		Effect.catchIf(
			error => isNotFound(error) || isTransportError(error),
			() => Effect.succeed(undefined),
		),
	) as Effect.Effect<A | undefined, Exclude<E, InstanceType<typeof NotFound>>, R>;
