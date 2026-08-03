import { policiesPolicyIdGet } from "@yorganci/netbird-api/policiesPolicyIdGet";
import * as Effect from "effect/Effect";
import { expect } from "vitest";
import { catchNotFound } from "../src/errors.ts";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";
import type { PolicyRule } from "../src/Policy/Policy.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-Policy");

const NAME_BASIC = "alchemy-test-policy-basic";
const NAME_DEFAULT = NetBird.DEFAULT_POLICY_NAME;

const deployPolicyFixture = (buildRules: (groups: { admin: string; servers: string }) => ReadonlyArray<PolicyRule>) =>
	Effect.gen(function* () {
		const adminGroup = yield* NetBird.Group("PolicyAdminGroup", { name: `${NAME_BASIC}-admin` });
		const serversGroup = yield* NetBird.Group("PolicyServersGroup", { name: `${NAME_BASIC}-servers` });
		const policy = yield* NetBird.Policy("BasicPolicy", {
			name: NAME_BASIC,
			description: "alchemy test policy",
			enabled: true,
			rules: buildRules({
				admin: adminGroup.groupId as unknown as string,
				servers: serversGroup.groupId as unknown as string,
			}),
		});
		return { adminGroup, serversGroup, policy };
	});

test.provider.skipIf(!isDockerReady)("create, update rules, and delete a policy", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const { policy } = yield* stack.deploy(
			deployPolicyFixture(({ admin, servers }) => [
				{
					name: "admin-ssh",
					enabled: true,
					action: "accept",
					bidirectional: false,
					protocol: "netbird-ssh",
					sources: [admin],
					destinations: [servers],
				},
			]),
		);

		expect(policy.policyId).toBeDefined();
		expect(policy.name).toEqual(NAME_BASIC);

		const live = yield* policiesPolicyIdGet({ policyId: policy.policyId });
		expect(live.rules).toHaveLength(1);
		expect(live.rules[0]?.protocol).toEqual("netbird-ssh");

		const { policy: updated } = yield* stack.deploy(
			deployPolicyFixture(({ admin, servers }) => [
				{
					name: "admin-ssh",
					description: "updated rule",
					enabled: true,
					action: "accept",
					bidirectional: false,
					protocol: "tcp",
					ports: ["22"],
					sources: [admin],
					destinations: [servers],
				},
			]),
		);
		expect(updated.policyId).toEqual(policy.policyId);

		const afterUpdate = yield* policiesPolicyIdGet({ policyId: policy.policyId });
		expect(afterUpdate.rules).toHaveLength(1);
		expect(afterUpdate.rules[0]?.protocol).toEqual("tcp");
		expect(afterUpdate.rules[0]?.ports).toEqual(["22"]);
		expect(afterUpdate.rules[0]?.description).toEqual("updated rule");

		yield* stack.destroy();

		const afterDestroy = yield* catchNotFound(policiesPolicyIdGet({ policyId: policy.policyId }));
		expect(afterDestroy).toBeUndefined();
	}).pipe(withLogLevel),
);

test.provider.skipIf(!isDockerReady)("never delete the dashboard Default policy", stack =>
	Effect.gen(function* () {
		yield* fixture;

		const { policy } = yield* stack.deploy(
			Effect.gen(function* () {
				const policy = yield* NetBird.Policy("DashboardDefault", {
					name: NAME_DEFAULT,
				});
				return { policy };
			}),
		);
		expect(policy.policyId).toBeDefined();

		yield* stack.destroy();

		const afterDestroy = yield* policiesPolicyIdGet({ policyId: policy.policyId });
		expect(afterDestroy.name).toEqual(NAME_DEFAULT);
	}).pipe(withLogLevel),
);
