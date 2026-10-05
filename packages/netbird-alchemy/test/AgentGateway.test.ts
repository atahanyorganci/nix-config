import { agentNetworkSettingsGet } from "@yorganci/netbird-api/agent_network";
import * as Alchemy from "alchemy";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { expect } from "vitest";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-AgentGateway");

// No proxy declares these addresses, which NetBird accepts as an address-first
// pin; the fixture runs without a proxy.
const CLUSTER = "proxy.test";
const OTHER_CLUSTER = "elsewhere.test";

test.provider.skipIf(!isDockerReady)(
	"bootstrap a labeled gateway, update its collection settings, adopt it, and delete it",
	stack =>
		Effect.gen(function* () {
			yield* fixture;
			yield* stack.destroy();

			const gateway = yield* stack.deploy(NetBird.AgentGateway("Gateway", { proxyAddress: CLUSTER }));
			expect(gateway.endpoint).toMatch(new RegExp(`^[a-z]+-[a-z]+\\.${CLUSTER.replace(".", "\\.")}$`));
			expect(gateway.url).toEqual(`https://${gateway.endpoint}`);
			expect(gateway.proxyAddress).toEqual(CLUSTER);
			expect(gateway.dedicated).toBe(false);
			// NetBird's bootstrap defaults when the props leave them out.
			expect(gateway.logCollection).toBe(true);
			expect(gateway.promptCollection).toBe(false);
			expect(gateway.accessLogRetentionDays).toEqual(30);

			const updated = yield* stack.deploy(
				NetBird.AgentGateway("Gateway", {
					proxyAddress: CLUSTER,
					promptCollection: true,
					redactPii: true,
					accessLogRetentionDays: 7,
				}),
			);
			expect(updated.endpoint).toEqual(gateway.endpoint);
			const live = yield* agentNetworkSettingsGet({});
			expect(live.endpoint).toEqual(gateway.endpoint);
			expect(live.enable_prompt_collection).toBe(true);
			expect(live.redact_pii).toBe(true);
			expect(live.access_log_retention_days).toEqual(7);

			const unchanged = yield* stack.plan(
				NetBird.AgentGateway("Gateway", {
					proxyAddress: CLUSTER,
					promptCollection: true,
					redactPii: true,
					accessLogRetentionDays: 7,
				}),
			);
			expect(Object.values(unchanged.resources).map(resource => resource.action)).toEqual(["noop"]);

			// Retained on destroy, then adopted by a fresh logical id.
			yield* stack.deploy(
				NetBird.AgentGateway("Gateway", { proxyAddress: CLUSTER }).pipe(Alchemy.RemovalPolicy.retain()),
			);
			yield* stack.destroy();
			expect((yield* agentNetworkSettingsGet({})).endpoint).toEqual(gateway.endpoint);

			const adopted = yield* stack.deploy(NetBird.AgentGateway("Adopted", { proxyAddress: CLUSTER }));
			expect(adopted.endpoint).toEqual(gateway.endpoint);
			expect(adopted.promptCollection).toBe(true);

			yield* stack.destroy();
			expect((yield* agentNetworkSettingsGet({})).endpoint).toEqual("");
		}).pipe(withLogLevel),
);

test.provider.skipIf(!isDockerReady)("refuse to move an existing gateway to another cluster", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const gateway = yield* stack.deploy(NetBird.AgentGateway("Gateway", { proxyAddress: CLUSTER }));

		const moved = yield* stack
			.deploy(NetBird.AgentGateway("Gateway", { proxyAddress: OTHER_CLUSTER }))
			.pipe(Effect.exit);
		expect(Exit.isFailure(moved)).toBe(true);
		if (Exit.isFailure(moved)) {
			expect(Cause.pretty(moved.cause)).toContain("immutable");
		}
		expect((yield* agentNetworkSettingsGet({})).endpoint).toEqual(gateway.endpoint);

		const both = yield* stack
			.deploy(NetBird.AgentGateway("Gateway", { proxyAddress: CLUSTER, endpoint: "agents.test" }))
			.pipe(Effect.exit);
		expect(Exit.isFailure(both)).toBe(true);

		yield* stack.deploy(NetBird.AgentGateway("Gateway", { proxyAddress: CLUSTER }));
		yield* stack.destroy();
		expect((yield* agentNetworkSettingsGet({})).endpoint).toEqual("");
	}).pipe(withLogLevel),
);
