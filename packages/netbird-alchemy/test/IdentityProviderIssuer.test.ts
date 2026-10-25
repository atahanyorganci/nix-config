import { it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import * as Redacted from "effect/Redacted";
import * as Ref from "effect/Ref";
import { TestClock } from "effect/testing";
import { describe, expect } from "vitest";
import {
	awaitIssuer,
	diffIdentityProvider,
	type IdentityProviderProps,
} from "../src/IdentityProvider/IdentityProvider.ts";
import type * as Duration from "effect/Duration";

const ISSUER = "https://auth.example.com";

/** An HttpClient answering each request with the next response, the last one forever. */
const scripted = (responses: ReadonlyArray<() => Response>) =>
	Effect.gen(function* () {
		const calls = yield* Ref.make(0);
		const client = HttpClient.make(request =>
			Ref.getAndUpdate(calls, n => n + 1).pipe(
				Effect.map(n => HttpClientResponse.fromWeb(request, responses[Math.min(n, responses.length - 1)]!())),
			),
		);
		return { client, calls };
	});

const discovery = (issuer: string) => () => Response.json({ issuer });
const unavailable = () => new Response("starting", { status: 503 });

/** Runs `awaitIssuer` against the client while the test clock moves `elapsed` ahead. */
const run = (client: HttpClient.HttpClient, timeout: Duration.Input, elapsed: Duration.Input) =>
	Effect.gen(function* () {
		const fiber = yield* awaitIssuer(ISSUER, timeout).pipe(
			Effect.provideService(HttpClient.HttpClient, client),
			Effect.exit,
			Effect.forkChild({ startImmediately: true }),
		);
		yield* TestClock.adjust(elapsed);
		return yield* Fiber.join(fiber);
	}).pipe(Effect.provide(TestClock.layer()));

describe("awaitIssuer", () => {
	it.effect("waits until the discovery document answers", () =>
		Effect.gen(function* () {
			const { client, calls } = yield* scripted([unavailable, unavailable, discovery(ISSUER)]);
			const exit = yield* run(client, "1 minute", "1 minute");
			expect(Exit.isSuccess(exit)).toBe(true);
			expect(yield* Ref.get(calls)).toEqual(3);
		}),
	);

	it.effect("refuses a document that names another issuer", () =>
		Effect.gen(function* () {
			const { client, calls } = yield* scripted([discovery("https://elsewhere.example.com")]);
			const exit = yield* run(client, 0, "1 second");
			expect(Exit.isFailure(exit)).toBe(true);
			expect(yield* Ref.get(calls)).toEqual(1);
		}),
	);

	it.effect("gives up after the timeout", () =>
		Effect.gen(function* () {
			const { client, calls } = yield* scripted([unavailable]);
			const exit = yield* run(client, "10 seconds", "1 minute");
			expect(Exit.isFailure(exit)).toBe(true);
			// The first try and one per 5 seconds.
			expect(yield* Ref.get(calls)).toEqual(3);
		}),
	);
});

describe("diffIdentityProvider", () => {
	const olds: IdentityProviderProps = {
		name: "Authelia",
		issuer: ISSUER,
		clientId: "netbird",
		clientSecret: Redacted.make("secret"),
	};

	it("ignores the ordering edge and the issuer timeout", () => {
		const news = { ...olds, clientSecret: Redacted.make("secret"), ready: "service-id", issuerTimeout: "1 minute" };
		expect(diffIdentityProvider({ news, olds })).toEqual({ action: "noop" });
	});

	it("replaces for another type", () => {
		expect(diffIdentityProvider({ news: { ...olds, type: "zitadel" }, olds })).toEqual({ action: "replace" });
	});

	it("leaves a changed secret to the engine", () => {
		expect(diffIdentityProvider({ news: { ...olds, clientSecret: Redacted.make("rotated") }, olds })).toBeUndefined();
	});
});
