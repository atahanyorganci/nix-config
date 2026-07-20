import { setupKeysKeyIdGet } from "@yorganci/netbird-api/setupKeysKeyIdGet";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import { expect } from "vitest";
import { catchNotFound } from "../src/errors.ts";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-SetupKey");

const NAME_BASIC = "alchemy-test-setupkey-basic";

test.provider.skipIf(!isDockerReady)("create and delete a setup key", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const key = yield* stack.deploy(
			NetBird.SetupKey("BasicSetupKey", {
				name: NAME_BASIC,
				type: "one-off",
				expiresIn: 3600,
				usageLimit: 1,
				autoGroups: [],
			}),
		);

		expect(key.keyId).toBeDefined();
		expect(key.name).toEqual(NAME_BASIC);
		expect(Redacted.value(key.key).length).toBeGreaterThan(0);
		expect(key.type).toEqual("one-off");
		expect(key.revoked).toEqual(false);

		const live = yield* setupKeysKeyIdGet({ keyId: key.keyId });
		expect(live.id).toEqual(key.keyId);
		expect(live.name).toEqual(NAME_BASIC);

		yield* stack.destroy();

		const afterDestroy = yield* catchNotFound(setupKeysKeyIdGet({ keyId: key.keyId }));
		expect(afterDestroy).toBeUndefined();
	}).pipe(withLogLevel),
);
