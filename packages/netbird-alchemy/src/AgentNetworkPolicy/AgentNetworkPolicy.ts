import {
	agentNetworkPoliciesGet,
	agentNetworkPoliciesPolicyIdDelete,
	agentNetworkPoliciesPolicyIdGet,
	agentNetworkPoliciesPolicyIdPut,
	agentNetworkPoliciesPost,
} from "@yorganci/netbird-api/agent_network";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound, catchNotFoundOrUnavailable } from "../errors.ts";

/** NetBird refuses a shorter window on an enabled limit. */
const MIN_WINDOW_SECONDS = 60;

/** Token cap per window. Each source group, and each user, gets its own bucket. `0` leaves that bucket uncapped. */
export interface AgentNetworkTokenLimit {
	/** @default 0 */
	groupCap?: number;
	/** @default 0 */
	userCap?: number;
	/** Window after which the counters reset; at least 60. */
	windowSeconds: number;
}

/** USD spend cap per window, priced from the providers' model prices. `0` leaves that bucket uncapped. */
export interface AgentNetworkBudgetLimit {
	/** @default 0 */
	groupCapUsd?: number;
	/** @default 0 */
	userCapUsd?: number;
	/** Window after which the counters reset; at least 60. */
	windowSeconds: number;
}

export interface AgentNetworkPolicyLimits {
	/** Omitted leaves tokens uncapped. */
	tokens?: AgentNetworkTokenLimit;
	/** Omitted leaves spend uncapped. */
	budget?: AgentNetworkBudgetLimit;
}

export interface AgentNetworkPolicyProps {
	/**
	 * Display name. Used as a stable identifier so the provider can locate
	 * the policy by name during adoption / state recovery. If omitted, a
	 * unique name is generated from the stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	/** Omitted leaves the current description. */
	description?: string;
	/** Omitted leaves the current value (NetBird's default on create: `true`). */
	enabled?: boolean;
	/** Group ids whose peers and users may call the providers. */
	sourceGroups: ReadonlyArray<string>;
	/** `AgentNetworkProvider` ids the source groups may call. */
	providers: ReadonlyArray<string>;
	/**
	 * `AgentNetworkGuardrail` ids applied to the requests this policy
	 * authorises.
	 *
	 * @default []
	 */
	guardrails?: ReadonlyArray<string>;
	/** Token and spend caps. Omitted leaves the policy uncapped. */
	limits?: AgentNetworkPolicyLimits;
}

export interface AgentNetworkPolicyAttributes {
	/** Policy id assigned by NetBird. */
	policyId: string;
	name: string;
	description: string;
	enabled: boolean;
	sourceGroups: ReadonlyArray<string>;
	providers: ReadonlyArray<string>;
	guardrails: ReadonlyArray<string>;
}

export type AgentNetworkPolicy = Resource<
	"NetBird.AgentNetworkPolicy",
	AgentNetworkPolicyProps,
	AgentNetworkPolicyAttributes
>;

/**
 * Authorises groups to call Agent Network providers, optionally with token
 * and spend caps and guardrails. NetBird denies every request no policy
 * allows; the union of the enabled policies' source groups is who can reach
 * the `AgentGateway` endpoint at all.
 *
 * @resource
 * @product Agent Network
 * @category NetBird
 * @section Creating a Policy
 * @example Let a group call one provider, capped at $5 a day
 * ```typescript
 * const policy = yield* NetBird.AgentNetworkPolicy("Agents", {
 *   name: "agents",
 *   sourceGroups: [agents.groupId],
 *   providers: [provider.providerId],
 *   guardrails: [guardrail.guardrailId],
 *   limits: { budget: { groupCapUsd: 5, windowSeconds: 86_400 } },
 * });
 * ```
 */
export const AgentNetworkPolicy = Resource<AgentNetworkPolicy>("NetBird.AgentNetworkPolicy");

export const isAgentNetworkPolicy = (value: unknown): value is AgentNetworkPolicy =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.AgentNetworkPolicy";

type ApiLimits = {
	token_limit: { enabled: boolean; group_cap: number; user_cap: number; window_seconds: number };
	budget_limit: { enabled: boolean; group_cap_usd: number; user_cap_usd: number; window_seconds: number };
};

type ApiPolicy = {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	source_groups: ReadonlyArray<string>;
	destination_provider_ids: ReadonlyArray<string>;
	guardrail_ids: ReadonlyArray<string>;
	limits: ApiLimits;
};

export const AgentNetworkPolicyProvider = () =>
	Provider.succeed(AgentNetworkPolicy, {
		stables: ["policyId"],
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.policyId) {
				const direct = yield* catchNotFound(agentNetworkPoliciesPolicyIdGet({ policyId: output.policyId }));
				if (direct) return toAttributes(direct);
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findPolicyByName(name);
			return existing ? toAttributes(existing) : undefined;
		}),
		list: Effect.fn(function* () {
			const all = yield* agentNetworkPoliciesGet({});
			return all.map(toAttributes);
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news;
			const name = yield* resolveName(id, props.name);
			const limits = yield* toApiLimits(name, props.limits);
			const sourceGroups = [...props.sourceGroups];
			const providers = [...props.providers];
			const guardrails = [...(props.guardrails ?? [])];

			let observed: ApiPolicy | undefined;
			if (output?.policyId) {
				observed = yield* catchNotFound(agentNetworkPoliciesPolicyIdGet({ policyId: output.policyId }));
			}
			if (!observed) {
				observed = yield* findPolicyByName(name);
			}

			if (!observed) {
				const created = yield* agentNetworkPoliciesPost({
					name,
					...(props.description !== undefined ? { description: props.description } : {}),
					...(props.enabled !== undefined ? { enabled: props.enabled } : {}),
					source_groups: sourceGroups,
					destination_provider_ids: providers,
					guardrail_ids: guardrails,
					limits,
				}).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findPolicyByName(name);
							if (existing) return existing;
							return yield* Effect.fail(err);
						}),
					),
				);
				return toAttributes(created);
			}

			const description = props.description ?? observed.description;
			const enabled = props.enabled ?? observed.enabled;
			if (
				observed.name !== name ||
				observed.description !== description ||
				observed.enabled !== enabled ||
				!sameSet(observed.source_groups, sourceGroups) ||
				!sameSet(observed.destination_provider_ids, providers) ||
				!sameSet(observed.guardrail_ids, guardrails) ||
				!limitsEqual(observed.limits, limits)
			) {
				const updated = yield* agentNetworkPoliciesPolicyIdPut({
					policyId: observed.id,
					name,
					description,
					enabled,
					source_groups: sourceGroups,
					destination_provider_ids: providers,
					guardrail_ids: guardrails,
					limits,
				});
				return toAttributes(updated);
			}

			return toAttributes(observed);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFoundOrUnavailable(agentNetworkPoliciesPolicyIdDelete({ policyId: output.policyId }));
		}),
	});

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const findPolicyByName = (name: string) =>
	agentNetworkPoliciesGet({}).pipe(
		Effect.map((policies): ApiPolicy | undefined => policies.find(policy => policy.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);

const toApiLimits = (name: string, limits: AgentNetworkPolicyLimits | undefined) =>
	Effect.gen(function* () {
		for (const [kind, limit] of [
			["tokens", limits?.tokens],
			["budget", limits?.budget],
		] as const) {
			if (limit !== undefined && limit.windowSeconds < MIN_WINDOW_SECONDS) {
				return yield* Effect.die(
					new Error(
						`NetBird.AgentNetworkPolicy "${name}": limits.${kind}.windowSeconds must be at least ${MIN_WINDOW_SECONDS}`,
					),
				);
			}
		}
		const tokens = limits?.tokens;
		const budget = limits?.budget;
		return {
			token_limit: tokens
				? {
						enabled: true,
						group_cap: tokens.groupCap ?? 0,
						user_cap: tokens.userCap ?? 0,
						window_seconds: tokens.windowSeconds,
					}
				: { enabled: false, group_cap: 0, user_cap: 0, window_seconds: 0 },
			budget_limit: budget
				? {
						enabled: true,
						group_cap_usd: budget.groupCapUsd ?? 0,
						user_cap_usd: budget.userCapUsd ?? 0,
						window_seconds: budget.windowSeconds,
					}
				: { enabled: false, group_cap_usd: 0, user_cap_usd: 0, window_seconds: 0 },
		} satisfies ApiLimits;
	});

/** A disabled limit's remaining fields are inert, whatever NetBird stores for them. */
const normalizeLimits = (limits: ApiLimits) =>
	JSON.stringify([
		limits.token_limit.enabled
			? [limits.token_limit.group_cap, limits.token_limit.user_cap, limits.token_limit.window_seconds]
			: null,
		limits.budget_limit.enabled
			? [limits.budget_limit.group_cap_usd, limits.budget_limit.user_cap_usd, limits.budget_limit.window_seconds]
			: null,
	]);

const limitsEqual = (a: ApiLimits, b: ApiLimits) => normalizeLimits(a) === normalizeLimits(b);

const sameSet = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) =>
	a.length === b.length && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

const toAttributes = (policy: ApiPolicy): AgentNetworkPolicyAttributes => ({
	policyId: policy.id,
	name: policy.name,
	description: policy.description,
	enabled: policy.enabled,
	sourceGroups: policy.source_groups,
	providers: policy.destination_provider_ids,
	guardrails: policy.guardrail_ids,
});
