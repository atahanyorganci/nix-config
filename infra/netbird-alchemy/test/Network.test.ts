import { networksNetworkIdGet } from "@yorganci/netbird-api/networksNetworkIdGet";
import * as Effect from "effect/Effect";
import { expect } from "vitest";
import { catchNotFound } from "../src/errors.ts";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-Network");

const NAME_BASIC = "alchemy-test-network-basic";

test.provider.skipIf(!isDockerReady)("create, update description, and delete a network", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const network = yield* stack.deploy(
			NetBird.Network("BasicNetwork", {
				name: NAME_BASIC,
				description: "alchemy test network",
			}),
		);

		expect(network.networkId).toBeDefined();
		expect(network.name).toEqual(NAME_BASIC);
		expect(network.description).toEqual("alchemy test network");

		const live = yield* networksNetworkIdGet({ networkId: network.networkId });
		expect(live.id).toEqual(network.networkId);
		expect(live.name).toEqual(NAME_BASIC);

		const updated = yield* stack.deploy(
			NetBird.Network("BasicNetwork", {
				name: NAME_BASIC,
				description: "alchemy test network updated",
			}),
		);
		expect(updated.networkId).toEqual(network.networkId);
		expect(updated.description).toEqual("alchemy test network updated");

		const afterUpdate = yield* networksNetworkIdGet({
			networkId: network.networkId,
		});
		expect(afterUpdate.description).toEqual("alchemy test network updated");

		yield* stack.destroy();

		const afterDestroy = yield* catchNotFound(networksNetworkIdGet({ networkId: network.networkId }));
		expect(afterDestroy).toBeUndefined();
	}).pipe(withLogLevel),
);
