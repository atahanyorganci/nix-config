import {
	agentNetworkGuardrailsGuardrailIdGet,
	agentNetworkPoliciesPolicyIdGet,
	agentNetworkProvidersProviderIdGet,
	agentNetworkSettingsGet,
} from "@yorganci/netbird-api/agent_network";
import * as Alchemy from "alchemy";
import * as Output from "alchemy/Output";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Redacted from "effect/Redacted";
import { expect } from "vitest";
import { catchNotFound } from "../src/errors.ts";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";
import type { AgentNetworkPolicyLimits } from "../src/AgentNetworkPolicy/AgentNetworkPolicy.ts";
import type { AgentNetworkProviderModel } from "../src/AgentNetworkProvider/AgentNetworkProvider.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-AgentNetwork");

const PREFIX = "alchemy-test-agent-network";
// A loopback upstream is never credential-checked, so nothing has to listen.
const UPSTREAM = "http://127.0.0.1:9";
const LUNA: AgentNetworkProviderModel = {
	id: "codex/gpt-6-luna",
	inputPer1k: 0.0001,
	outputPer1k: 0.0005,
	cachedInputPer1k: 0.00001,
};
const SOL: AgentNetworkProviderModel = { id: "codex/gpt-6.1-sol", inputPer1k: 0.002, outputPer1k: 0.01 };

interface Desired {
	promptCollection?: boolean;
	apiKey: string;
	models: ReadonlyArray<AgentNetworkProviderModel>;
	modelAllowlist?: ReadonlyArray<string>;
	limits?: AgentNetworkPolicyLimits;
}

const deployAgentNetwork = (desired: Desired) =>
	Effect.gen(function* () {
		const gateway = yield* NetBird.AgentGateway("Gateway", {
			proxyAddress: "proxy.test",
			promptCollection: desired.promptCollection ?? true,
		});
		const group = yield* NetBird.Group("Agents", { name: `${PREFIX}-agents` });
		const provider = yield* NetBird.AgentNetworkProvider("Provider", {
			name: `${PREFIX}-provider`,
			catalogId: "agentgateway",
			upstreamUrl: UPSTREAM,
			apiKey: Redacted.make(desired.apiKey),
			models: desired.models,
			gateway: gateway.endpoint,
		});
		const guardrail = yield* NetBird.AgentNetworkGuardrail("Guardrail", {
			name: `${PREFIX}-guardrail`,
			description: "alchemy test guardrail",
			promptCapture: {},
			...(desired.modelAllowlist ? { modelAllowlist: { models: desired.modelAllowlist } } : {}),
		});
		const policy = yield* NetBird.AgentNetworkPolicy("Policy", {
			name: `${PREFIX}-policy`,
			sourceGroups: Output.all(group.groupId).pipe(Output.map(ids => [...ids])),
			providers: Output.all(provider.providerId).pipe(Output.map(ids => [...ids])),
			guardrails: Output.all(guardrail.guardrailId).pipe(Output.map(ids => [...ids])),
			...(desired.limits ? { limits: desired.limits } : {}),
		});
		return { gateway, group, provider, guardrail, policy };
	});

test.provider.skipIf(!isDockerReady)(
	"connect a provider, authorise a group through a guardrail, update them, and tear down in order",
	stack =>
		Effect.gen(function* () {
			yield* fixture;
			yield* stack.destroy();

			const first = yield* stack.deploy(deployAgentNetwork({ apiKey: "first", models: [LUNA] }));

			const provider = yield* agentNetworkProvidersProviderIdGet({ providerId: first.provider.providerId });
			expect(provider.provider_id).toEqual("agentgateway");
			expect(provider.upstream_url).toEqual(UPSTREAM);
			expect(provider.models).toEqual([
				{ id: LUNA.id, input_per_1k: 0.0001, output_per_1k: 0.0005, cached_input_per_1k: 0.00001 },
			]);
			expect(first.provider.models).toEqual([LUNA]);

			const guardrail = yield* agentNetworkGuardrailsGuardrailIdGet({ guardrailId: first.guardrail.guardrailId });
			expect(guardrail.checks.prompt_capture).toEqual({ enabled: true, redact_pii: false });
			expect(guardrail.checks.model_allowlist.enabled).toBe(false);

			const policy = yield* agentNetworkPoliciesPolicyIdGet({ policyId: first.policy.policyId });
			expect(policy.enabled).toBe(true);
			expect(policy.source_groups).toEqual([first.group.groupId]);
			expect(policy.destination_provider_ids).toEqual([first.provider.providerId]);
			expect(policy.guardrail_ids).toEqual([first.guardrail.guardrailId]);
			expect(policy.limits.token_limit.enabled).toBe(false);
			expect(policy.limits.budget_limit.enabled).toBe(false);

			// Nothing drifts when the same configuration is planned again.
			const replanned = yield* stack.plan(deployAgentNetwork({ apiKey: "first", models: [LUNA] }));
			expect(new Set(Object.values(replanned.resources).map(resource => resource.action))).toEqual(new Set(["noop"]));

			// The endpoint is stable, so a gateway settings change does not ripple
			// into the providers ordered after it.
			const toggled = yield* stack.plan(
				deployAgentNetwork({ promptCollection: false, apiKey: "first", models: [LUNA] }),
			);
			const actions = Object.fromEntries(
				Object.entries(toggled.resources).map(([fqn, resource]) => [fqn, resource.action]),
			);
			expect(actions).toMatchObject({ Gateway: "update", Provider: "noop", Policy: "noop" });

			const second = yield* stack.deploy(
				deployAgentNetwork({
					apiKey: "second",
					models: [LUNA, SOL],
					modelAllowlist: [LUNA.id],
					limits: {
						tokens: { groupCap: 1_000_000, windowSeconds: 3_600 },
						budget: { groupCapUsd: 5, windowSeconds: 86_400 },
					},
				}),
			);
			expect(second.provider.providerId).toEqual(first.provider.providerId);
			expect(second.policy.policyId).toEqual(first.policy.policyId);

			const updatedProvider = yield* agentNetworkProvidersProviderIdGet({ providerId: first.provider.providerId });
			expect(updatedProvider.models.map(model => model.id).sort()).toEqual([SOL.id, LUNA.id].sort());

			const updatedGuardrail = yield* agentNetworkGuardrailsGuardrailIdGet({
				guardrailId: first.guardrail.guardrailId,
			});
			expect(updatedGuardrail.checks.model_allowlist).toEqual({ enabled: true, models: [LUNA.id] });

			const capped = yield* agentNetworkPoliciesPolicyIdGet({ policyId: first.policy.policyId });
			expect(capped.limits.token_limit).toEqual({
				enabled: true,
				group_cap: 1_000_000,
				user_cap: 0,
				window_seconds: 3_600,
			});
			expect(capped.limits.budget_limit).toEqual({
				enabled: true,
				group_cap_usd: 5,
				user_cap_usd: 0,
				window_seconds: 86_400,
			});

			yield* stack.deploy(deployAgentNetwork({ apiKey: "second", models: [LUNA] }));
			const uncapped = yield* agentNetworkPoliciesPolicyIdGet({ policyId: first.policy.policyId });
			expect(uncapped.limits.token_limit.enabled).toBe(false);
			expect(uncapped.limits.budget_limit.enabled).toBe(false);
			const unrestricted = yield* agentNetworkGuardrailsGuardrailIdGet({ guardrailId: first.guardrail.guardrailId });
			expect(unrestricted.checks.model_allowlist.enabled).toBe(false);

			// Policies go before providers, and providers before the gateway,
			// which NetBird refuses to delete while any provider exists.
			yield* stack.destroy();
			expect(
				yield* catchNotFound(agentNetworkPoliciesPolicyIdGet({ policyId: first.policy.policyId })),
			).toBeUndefined();
			expect(
				yield* catchNotFound(agentNetworkProvidersProviderIdGet({ providerId: first.provider.providerId })),
			).toBeUndefined();
			expect(
				yield* catchNotFound(agentNetworkGuardrailsGuardrailIdGet({ guardrailId: first.guardrail.guardrailId })),
			).toBeUndefined();
			expect((yield* agentNetworkSettingsGet({})).endpoint).toEqual("");
		}).pipe(withLogLevel),
);

test.provider.skipIf(!isDockerReady)("adopt an existing provider by name", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const provider = (id: string) =>
			NetBird.AgentNetworkProvider(id, {
				name: `${PREFIX}-adopted`,
				catalogId: "custom",
				upstreamUrl: UPSTREAM,
				apiKey: Redacted.make("adopted"),
				models: [LUNA],
			});

		const original = yield* stack.deploy(provider("Original").pipe(Alchemy.RemovalPolicy.retain()));
		yield* stack.destroy();
		expect(yield* catchNotFound(agentNetworkProvidersProviderIdGet({ providerId: original.providerId }))).toBeDefined();

		const adopted = yield* stack.deploy(provider("Adopted"));
		expect(adopted.providerId).toEqual(original.providerId);
		expect(adopted.catalogId).toEqual("custom");

		yield* stack.destroy();
		expect(
			yield* catchNotFound(agentNetworkProvidersProviderIdGet({ providerId: original.providerId })),
		).toBeUndefined();
	}).pipe(withLogLevel),
);

test.provider.skipIf(!isDockerReady)("a catch-all provider behind a policy without guardrails", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const program = Effect.gen(function* () {
			const group = yield* NetBird.Group("Everyone", { name: `${PREFIX}-everyone` });
			const provider = yield* NetBird.AgentNetworkProvider("CatchAll", {
				name: `${PREFIX}-catch-all`,
				catalogId: "custom",
				upstreamUrl: UPSTREAM,
				apiKey: Redacted.make("catch-all"),
			});
			// Arrays of Outputs resolve element by element.
			const policy = yield* NetBird.AgentNetworkPolicy("Bare", {
				name: `${PREFIX}-bare`,
				sourceGroups: [group.groupId],
				providers: [provider.providerId],
			});
			return { provider, policy };
		});

		const { provider, policy } = yield* stack.deploy(program);
		expect(provider.models).toEqual([]);
		expect(policy.providers).toEqual([provider.providerId]);
		expect(policy.guardrails).toEqual([]);

		const replanned = yield* stack.plan(program);
		expect(new Set(Object.values(replanned.resources).map(resource => resource.action))).toEqual(new Set(["noop"]));

		yield* stack.destroy();
	}).pipe(withLogLevel),
);

test.provider.skipIf(!isDockerReady)("refuse a limit window under a minute", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const exit = yield* stack
			.deploy(
				deployAgentNetwork({
					apiKey: "first",
					models: [LUNA],
					limits: { tokens: { groupCap: 10, windowSeconds: 30 } },
				}),
			)
			.pipe(Effect.exit);
		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			expect(Cause.pretty(exit.cause)).toContain("windowSeconds must be at least 60");
		}

		yield* stack.destroy();
		expect((yield* agentNetworkSettingsGet({})).endpoint).toEqual("");
	}).pipe(withLogLevel),
);
