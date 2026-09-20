import * as Alchemy from "alchemy";
import * as Docker from "alchemy/Docker";
import * as Test from "alchemy/Test/Vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Ref from "effect/Ref";
import * as NetBird from "../src/index.ts";
import {
	bootstrapPat,
	deployNetBirdServerResources,
	type NetBirdServerHandle,
	waitUntilReady,
} from "./fixtures/NetBirdServer.ts";
import { isDockerReady } from "./fixtures/Runtime.ts";
import type { StackServices } from "alchemy/Stack";

/**
 * Per-file Vitest harness: Docker NetBird fixture + scratch-stack resource tests.
 *
 * The fixture boots lazily on first `yield* fixture` (inside `it.live`) so it
 * shares the test Effect runtime. `afterAll` destroys the fixture stack.
 * Credentials live in a Ref provided by the providers Layer so
 * create/update/delete and ensuring teardown all see the same PAT.
 */
export const createHarness = (fixtureName: string) => {
	const credsRef = Ref.makeUnsafe({
		apiToken: Redacted.make(""),
		apiBaseUrl: "http://127.0.0.1:0",
	} satisfies NetBird.CredentialsConfig);

	const handleRef = Ref.makeUnsafe<NetBirdServerHandle | null>(null);

	const CredentialsFromFixture = Layer.succeed(
		NetBird.Credentials,
		Effect.gen(function* () {
			return yield* Ref.get(credsRef);
		}),
	);

	const api = Test.make({
		providers: Layer.mergeAll(Docker.providers(), NetBird.resourceProviders()).pipe(
			Layer.provideMerge(CredentialsFromFixture),
		) as Layer.Layer<Docker.Docker | NetBird.ProviderRequirements, never, StackServices>,
	});

	const fixtureStack = Alchemy.Stack(
		fixtureName,
		{
			providers: Docker.providers(),
			state: Alchemy.inMemoryState(),
		},
		deployNetBirdServerResources.pipe(Effect.orDie),
	);

	const fixture = Effect.gen(function* () {
		const existing = yield* Ref.get(handleRef);
		if (existing) return existing;

		if (!isDockerReady) {
			const skipped = {
				baseUrl: "http://127.0.0.1:0",
				hostPort: 0,
				apiToken: Redacted.make(""),
			} satisfies NetBirdServerHandle;
			yield* Ref.set(handleRef, skipped);
			return skipped;
		}

		const resources = yield* api.deploy(fixtureStack);
		yield* waitUntilReady(resources.baseUrl);
		const apiToken = yield* bootstrapPat(resources.baseUrl);
		const handle = {
			baseUrl: resources.baseUrl,
			hostPort: resources.hostPort,
			apiToken,
		} satisfies NetBirdServerHandle;
		yield* Ref.set(credsRef, {
			apiToken,
			apiBaseUrl: resources.baseUrl,
		});
		yield* Ref.set(handleRef, handle);
		return handle;
	}).pipe(Effect.orDie);

	api.afterAll.skipIf(!isDockerReady)(api.destroy(fixtureStack), {
		timeout: 120_000,
	});

	return {
		test: api.test as Test.TestApi["test"],
		fixture,
		isDockerReady,
	};
};
