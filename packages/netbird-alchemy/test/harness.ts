import * as Alchemy from "alchemy";
import * as Docker from "alchemy/Docker";
import * as Test from "alchemy/Test/Vitest";
import * as ConfigProvider from "effect/ConfigProvider";
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

/**
 * Per-file Vitest harness: Docker NetBird fixture + scratch-stack resource tests.
 *
 * The fixture boots lazily on first `yield* fixture` (inside `it.live`) so it
 * shares the test Effect runtime. `afterAll` destroys the fixture stack.
 * The fixture's PAT reaches `NetBird.providers()` as `NB_PAT` /
 * `NB_MANAGEMENT_URL` environment credentials, read from a Ref the fixture
 * fills once it has booted. The providers resolve them on first use, so
 * create/update/delete and ensuring teardown all see the same PAT.
 */
export const createHarness = (fixtureName: string) => {
	const envRef = Ref.makeUnsafe<Record<string, string>>({});

	const handleRef = Ref.makeUnsafe<NetBirdServerHandle | null>(null);

	const FixtureEnv = ConfigProvider.layer(
		ConfigProvider.orElse(ConfigProvider.fromEnv())(
			ConfigProvider.make(path =>
				Ref.get(envRef).pipe(Effect.flatMap(env => ConfigProvider.fromEnv({ env }).load(path))),
			),
		),
	);

	const api = Test.make({
		providers: Layer.mergeAll(Docker.providers(), NetBird.providers().pipe(Layer.provide(FixtureEnv))),
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
		yield* Ref.set(envRef, {
			[NetBird.NB_PAT_ENV]: Redacted.value(apiToken),
			[NetBird.NB_MANAGEMENT_URL_ENV]: resources.baseUrl,
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
