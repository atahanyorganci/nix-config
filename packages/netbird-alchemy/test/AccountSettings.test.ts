import { accountsGet } from "@yorganci/netbird-api/accounts";
import * as Effect from "effect/Effect";
import { expect } from "vitest";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-AccountSettings");

const live = accountsGet({}).pipe(Effect.map(accounts => accounts[0]!.settings));

test.provider.skipIf(!isDockerReady)("adopt the account, change its settings, and leave them on destroy", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();
		const before = yield* live;

		const settings = yield* stack.deploy(
			NetBird.AccountSettings("Account", { userApprovalRequired: false, groupsPropagationEnabled: true }),
		);
		expect(settings.accountId).toBeDefined();
		expect(settings.userApprovalRequired).toBe(false);
		expect(settings.groupsPropagationEnabled).toBe(true);
		expect(settings.localAuthDisabled).toBe(false);

		const after = yield* live;
		expect(after.extra?.user_approval_required).toBe(false);
		expect(after.groups_propagation_enabled).toBe(true);
		// Everything else is as it was.
		expect(after.dns_domain).toEqual(before.dns_domain);
		expect(after.peer_login_expiration).toEqual(before.peer_login_expiration);
		expect(after.regular_users_view_blocked).toEqual(before.regular_users_view_blocked);

		const unchanged = yield* stack.plan(
			NetBird.AccountSettings("Account", { userApprovalRequired: false, groupsPropagationEnabled: true }),
		);
		expect(Object.values(unchanged.resources).map(resource => resource.action)).toEqual(["noop"]);

		yield* stack.deploy(NetBird.AccountSettings("Account", { userApprovalRequired: true }));
		expect((yield* live).extra?.user_approval_required).toBe(true);

		// Destroying the resource leaves the settings alone.
		yield* stack.destroy();
		expect((yield* live).extra?.user_approval_required).toBe(true);
	}).pipe(withLogLevel),
);
