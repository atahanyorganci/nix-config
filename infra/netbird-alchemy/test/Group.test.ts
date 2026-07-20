import { groupsGroupIdGet } from "@yorganci/netbird-api/groupsGroupIdGet";
import * as Effect from "effect/Effect";
import { expect } from "vitest";
import { catchNotFound } from "../src/errors.ts";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-Group");

const NAME_BASIC = "alchemy-test-group-basic";
const NAME_UPDATE = "alchemy-test-group-update";

test.provider.skipIf(!isDockerReady)("create, update, and delete a group", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const group = yield* stack.deploy(NetBird.Group("BasicGroup", { name: NAME_BASIC }));

		expect(group.groupId).toBeDefined();
		expect(group.name).toEqual(NAME_BASIC);

		const live = yield* groupsGroupIdGet({ groupId: group.groupId });
		expect(live.id).toEqual(group.groupId);
		expect(live.name).toEqual(NAME_BASIC);

		const updated = yield* stack.deploy(
			NetBird.Group("BasicGroup", {
				name: NAME_BASIC,
				peers: [],
			}),
		);
		expect(updated.groupId).toEqual(group.groupId);

		yield* stack.destroy();

		const afterDestroy = yield* catchNotFound(groupsGroupIdGet({ groupId: group.groupId }));
		expect(afterDestroy).toBeUndefined();
	}).pipe(withLogLevel),
);

test.provider.skipIf(!isDockerReady)("update group name in place", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const group = yield* stack.deploy(NetBird.Group("RenameGroup", { name: NAME_UPDATE }));

		const renamed = yield* stack.deploy(
			NetBird.Group("RenameGroup", {
				name: `${NAME_UPDATE}-renamed`,
			}),
		);
		expect(renamed.groupId).toEqual(group.groupId);
		expect(renamed.name).toEqual(`${NAME_UPDATE}-renamed`);

		const live = yield* groupsGroupIdGet({ groupId: renamed.groupId });
		expect(live.name).toEqual(`${NAME_UPDATE}-renamed`);

		yield* stack.destroy();
	}).pipe(withLogLevel),
);
