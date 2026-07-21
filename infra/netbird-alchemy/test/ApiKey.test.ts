import { usersUserIdTokensTokenIdGet } from "@yorganci/netbird-api/usersUserIdTokensTokenIdGet";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import { expect } from "vitest";
import { catchNotFound } from "../src/errors.ts";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-ApiKey");

const USER_NAME = "alchemy-test-apikey-user";
const KEY_NAME = "alchemy-test-apikey-basic";

test.provider.skipIf(!isDockerReady)("create and delete an API key for a service user", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const { user, apiKey } = yield* stack.deploy(
			Effect.gen(function* () {
				const user = yield* NetBird.User("ApiKeyUser", {
					name: USER_NAME,
					role: "admin",
					isServiceUser: true,
					autoGroups: [],
				});

				const apiKey = yield* NetBird.ApiKey("BasicApiKey", {
					userId: user.userId,
					name: KEY_NAME,
					expiresIn: 30,
				});

				return { user, apiKey };
			}),
		);

		expect(apiKey.tokenId).toBeDefined();
		expect(apiKey.userId).toEqual(user.userId);
		expect(apiKey.name).toEqual(KEY_NAME);
		expect(Redacted.value(apiKey.token).length).toBeGreaterThan(0);
		expect(apiKey.expirationDate).toBeDefined();
		expect(apiKey.createdAt).toBeDefined();
		expect(apiKey.createdBy).toBeDefined();

		const live = yield* usersUserIdTokensTokenIdGet({
			userId: user.userId,
			tokenId: apiKey.tokenId,
		});
		expect(live.id).toEqual(apiKey.tokenId);
		expect(live.name).toEqual(KEY_NAME);

		yield* stack.destroy();

		const afterDestroy = yield* catchNotFound(
			usersUserIdTokensTokenIdGet({
				userId: user.userId,
				tokenId: apiKey.tokenId,
			}),
		);
		expect(afterDestroy).toBeUndefined();
	}).pipe(withLogLevel),
);
