import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type {
	AgentGatewayProps,
	AgentNetworkGuardrailProps,
	AgentNetworkPolicyLimits,
	AgentNetworkProviderModel,
} from "@yorganci/netbird-alchemy";

/**
 * Groups an Agent Network policy may authorise. `Agents` is allowed here,
 * unlike as a mesh policy source: an Agent Network policy only opens the proxy
 * peer on 80/443, and the proxy checks every other service's own access
 * groups. `All` would include the proxy's peers, and `Proxy` is not a caller.
 */
export const AgentNetworkSourceGroupName = Schema.Literals(["Admin", "Users", "Servers", "Agents"]);
export type AgentNetworkSourceGroupName = typeof AgentNetworkSourceGroupName.Type;

/** USD per million tokens, as `flake.agentGateway.models` prices them. */
const Rates = {
	input: Schema.Number,
	output: Schema.Number,
	cacheRead: Schema.NullOr(Schema.Number),
	cacheWrite: Schema.NullOr(Schema.Number),
};

export const ModelCost = Schema.Struct({
	...Rates,
	tiers: Schema.Array(Schema.Struct({ ...Rates, inputTokensAbove: Schema.Number })),
});
export type ModelCost = typeof ModelCost.Type;

export const Provider = Schema.Struct({
	host: Schema.String,
	catalogId: Schema.String,
	upstreamUrl: Schema.String,
	models: Schema.Array(Schema.Struct({ id: Schema.String, cost: ModelCost })),
});
export type Provider = typeof Provider.Type;

export const Guardrail = Schema.Struct({
	description: Schema.String,
	modelAllowlist: Schema.NullOr(Schema.Array(Schema.String)),
	promptCapture: Schema.NullOr(Schema.Struct({ redactPii: Schema.Boolean })),
});
export type Guardrail = typeof Guardrail.Type;

export const Policy = Schema.Struct({
	description: Schema.String,
	enabled: Schema.Boolean,
	sourceGroups: Schema.Array(AgentNetworkSourceGroupName),
	providers: Schema.Array(Schema.String),
	guardrails: Schema.Array(Schema.String),
	limits: Schema.Struct({
		tokens: Schema.NullOr(
			Schema.Struct({ groupCap: Schema.Number, userCap: Schema.Number, windowSeconds: Schema.Number }),
		),
		budget: Schema.NullOr(
			Schema.Struct({ groupCapUsd: Schema.Number, userCapUsd: Schema.Number, windowSeconds: Schema.Number }),
		),
	}),
});
export type Policy = typeof Policy.Type;

export const Gateway = Schema.Struct({
	proxyAddress: Schema.String,
	endpoint: Schema.NullOr(Schema.String),
	logCollection: Schema.Boolean,
	promptCollection: Schema.Boolean,
	redactPii: Schema.Boolean,
	accessLogRetentionDays: Schema.Number,
});
export type Gateway = typeof Gateway.Type;

/** `.#agentNetwork` (`modules/flake/agent-network.nix`). */
export const AgentNetwork = Schema.Struct({
	enable: Schema.Boolean,
	gateway: Gateway,
	providers: Schema.Record(Schema.String, Provider),
	guardrails: Schema.Record(Schema.String, Guardrail),
	policies: Schema.Record(Schema.String, Policy),
});
export type AgentNetwork = typeof AgentNetwork.Type;

/** Every provider and guardrail a policy names has to be declared. */
export const validate = (config: AgentNetwork) => {
	const problems: Array<string> = [];
	for (const [name, policy] of Object.entries(config.policies)) {
		for (const provider of policy.providers) {
			if (!(provider in config.providers)) {
				problems.push(`policy "${name}" names unknown provider "${provider}"`);
			}
		}
		for (const guardrail of policy.guardrails) {
			if (!(guardrail in config.guardrails)) {
				problems.push(`policy "${name}" names unknown guardrail "${guardrail}"`);
			}
		}
	}
	return problems.length === 0
		? Effect.succeed(config)
		: Effect.die(new Error(`flake.agentNetwork: ${problems.join("; ")}`));
};

export const gatewayProps = (gateway: Gateway): AgentGatewayProps => ({
	proxyAddress: gateway.proxyAddress,
	logCollection: gateway.logCollection,
	promptCollection: gateway.promptCollection,
	redactPii: gateway.redactPii,
	accessLogRetentionDays: gateway.accessLogRetentionDays,
});

/** USD per million tokens to NetBird's USD per 1k, without binary noise (`0.1 / 1000`). */
const per1k = (usdPerMillion: number) => Number((usdPerMillion / 1000).toPrecision(12));

/**
 * NetBird prices flat per 1k tokens, so a tiered model is metered at its base
 * rates: costs above the first price break are under-reported. Requests reach
 * the gateway as OpenAI chat completions, where cached tokens are part of the
 * prompt and billed at `cachedInputPer1k`; that shape has no cache writes.
 */
export const toNetBirdModels = (models: Provider["models"]): Array<AgentNetworkProviderModel> =>
	models.map(({ id, cost }) => ({
		id,
		inputPer1k: per1k(cost.input),
		outputPer1k: per1k(cost.output),
		...(cost.cacheRead !== null ? { cachedInputPer1k: per1k(cost.cacheRead) } : {}),
	}));

export const guardrailProps = (name: string, guardrail: Guardrail): AgentNetworkGuardrailProps => ({
	name,
	description: guardrail.description,
	...(guardrail.modelAllowlist !== null ? { modelAllowlist: { models: guardrail.modelAllowlist } } : {}),
	...(guardrail.promptCapture !== null ? { promptCapture: { redactPii: guardrail.promptCapture.redactPii } } : {}),
});

export const policyLimits = (limits: Policy["limits"]): AgentNetworkPolicyLimits => ({
	...(limits.tokens !== null ? { tokens: limits.tokens } : {}),
	...(limits.budget !== null ? { budget: limits.budget } : {}),
});
