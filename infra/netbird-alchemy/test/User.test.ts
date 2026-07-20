import { usersGet } from "@yorganci/netbird-api/usersGet";
import * as Effect from "effect/Effect";
import { expect } from "vitest";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-User");

const NAME_BASIC = "alchemy-test-user-basic";

test.provider.skipIf(!isDockerReady)("create, update, and delete a service user", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const user = yield* stack.deploy(
			NetBird.User("BasicUser", {
				name: NAME_BASIC,
				role: "user",
				isServiceUser: true,
				autoGroups: [],
			}),
		);

		expect(user.userId).toBeDefined();
		expect(user.name).toEqual(NAME_BASIC);
		expect(user.isServiceUser).toEqual(true);
		expect(user.role).toEqual("user");

		const listed = yield* usersGet({ service_user: true });
		const live = listed.find(u => u.id === user.userId);
		expect(live).toBeDefined();
		expect(live?.name).toEqual(NAME_BASIC);

		const updated = yield* stack.deploy(
			NetBird.User("BasicUser", {
				name: NAME_BASIC,
				role: "admin",
				isServiceUser: true,
				autoGroups: [],
			}),
		);
		expect(updated.userId).toEqual(user.userId);
		expect(updated.role).toEqual("admin");

		const afterUpdate = yield* usersGet({ service_user: true });
		expect(afterUpdate.find(u => u.id === user.userId)?.role).toEqual("admin");

		yield* stack.destroy();

		const afterDestroy = yield* usersGet({ service_user: true });
		expect(afterDestroy.find(u => u.id === user.userId)).toBeUndefined();
	}).pipe(withLogLevel),
);
