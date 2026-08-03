import { postureChecksPostureCheckIdGet } from "@yorganci/netbird-api/postureChecksPostureCheckIdGet";
import * as Effect from "effect/Effect";
import { expect } from "vitest";
import { catchNotFound } from "../src/errors.ts";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-PostureCheck");

const NAME_BASIC = "alchemy-test-posture-basic";

test.provider.skipIf(!isDockerReady)("create, update checks, and delete a posture check", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const check = yield* stack.deploy(
			NetBird.PostureCheck("BasicCheck", {
				name: NAME_BASIC,
				description: "alchemy test posture check",
				checks: {
					nbVersionCheck: { minVersion: "0.75.0" },
				},
			}),
		);

		expect(check.postureCheckId).toBeDefined();
		expect(check.name).toEqual(NAME_BASIC);

		const live = yield* postureChecksPostureCheckIdGet({ postureCheckId: check.postureCheckId });
		expect(live.checks.nb_version_check?.min_version).toEqual("0.75.0");

		const updated = yield* stack.deploy(
			NetBird.PostureCheck("BasicCheck", {
				name: NAME_BASIC,
				description: "alchemy test posture check updated",
				checks: {
					nbVersionCheck: { minVersion: "0.76.0" },
					peerNetworkRangeCheck: {
						ranges: ["100.64.0.0/10"],
						action: "allow",
					},
				},
			}),
		);
		expect(updated.postureCheckId).toEqual(check.postureCheckId);

		const afterUpdate = yield* postureChecksPostureCheckIdGet({ postureCheckId: check.postureCheckId });
		expect(afterUpdate.checks.nb_version_check?.min_version).toEqual("0.76.0");
		expect(afterUpdate.checks.peer_network_range_check?.ranges).toEqual(["100.64.0.0/10"]);

		yield* stack.destroy();

		const afterDestroy = yield* catchNotFound(postureChecksPostureCheckIdGet({ postureCheckId: check.postureCheckId }));
		expect(afterDestroy).toBeUndefined();
	}).pipe(withLogLevel),
);
