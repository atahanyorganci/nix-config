import { policiesGet } from "@yorganci/netbird-api/policiesGet";
import { policiesPolicyIdDelete } from "@yorganci/netbird-api/policiesPolicyIdDelete";
import { policiesPolicyIdGet } from "@yorganci/netbird-api/policiesPolicyIdGet";
import { policiesPolicyIdPut } from "@yorganci/netbird-api/policiesPolicyIdPut";
import { policiesPost } from "@yorganci/netbird-api/policiesPost";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound, catchNotFoundOrUnavailable } from "../errors.ts";

export type PolicyProtocol = "all" | "tcp" | "udp" | "icmp" | "netbird-ssh";
export type PolicyAction = "accept" | "drop";

export interface PolicyPortRange {
	start: number;
	end: number;
}

export interface PolicyRule {
	name: string;
	description?: string;
	enabled: boolean;
	action: PolicyAction;
	bidirectional: boolean;
	protocol: PolicyProtocol;
	ports?: ReadonlyArray<string>;
	portRanges?: ReadonlyArray<PolicyPortRange>;
	sources?: ReadonlyArray<string>;
	destinations?: ReadonlyArray<string>;
}

export interface PolicyProps {
	/**
	 * Display name for the policy. Used as a stable identifier so the
	 * provider can locate the policy by name during adoption / state
	 * recovery. If omitted, a unique name is generated from the
	 * stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	description?: string;
	enabled?: boolean;
	sourcePostureChecks?: ReadonlyArray<string>;
	rules?: ReadonlyArray<PolicyRule>;
}

export interface PolicyAttributes {
	policyId: string;
	name: string;
	description: string | undefined;
	enabled: boolean;
}

export type Policy = Resource<"NetBird.Policy", PolicyProps, PolicyAttributes>;

/**
 * A NetBird access policy — group-scoped allow/drop rules for mesh traffic.
 *
 * @resource
 * @product Policies
 * @category NetBird
 * @section Creating a Policy
 * @example Admin-to-servers SSH
 * ```typescript
 * const policy = yield* NetBird.Policy("AdminSsh", {
 *   name: "admin-ssh",
 *   enabled: true,
 *   rules: [{
 *     name: "admin-ssh",
 *     enabled: true,
 *     action: "accept",
 *     bidirectional: false,
 *     protocol: "netbird-ssh",
 *     sources: [adminGroup.groupId],
 *     destinations: [serversGroup.groupId],
 *   }],
 * });
 * ```
 */
export const Policy = Resource<Policy>("NetBird.Policy");

export const isPolicy = (value: unknown): value is Policy =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.Policy";

/** Dashboard-managed default policy — never deleted on stack destroy. */
export const DEFAULT_POLICY_NAME = "Default";

type ApiPolicy = {
	id?: string;
	name: string;
	description?: string;
	enabled: boolean;
	source_posture_checks: ReadonlyArray<string>;
	rules: ReadonlyArray<ApiRule>;
};

type ApiRule = {
	id?: string;
	name: string;
	description?: string;
	enabled: boolean;
	action: PolicyAction;
	bidirectional: boolean;
	protocol: PolicyProtocol;
	ports?: ReadonlyArray<string>;
	port_ranges?: ReadonlyArray<PolicyPortRange>;
	sources?: ReadonlyArray<{ id: string }> | null;
	destinations?: ReadonlyArray<{ id: string }> | null;
};

const normalizePolicy = (policy: {
	id?: string;
	name: string;
	description?: string;
	enabled: boolean;
	source_posture_checks: ReadonlyArray<string> | null;
	rules: ReadonlyArray<ApiRule>;
}): ApiPolicy => ({
	...policy,
	source_posture_checks: policy.source_posture_checks ?? [],
});

export const PolicyProvider = () =>
	Provider.succeed(Policy, {
		stables: ["policyId", "name"],
		diff: ({ news }) =>
			Effect.sync(() => {
				if (!isResolved(news)) return undefined;
			}),
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.policyId) {
				const direct = yield* catchNotFound(policiesPolicyIdGet({ policyId: output.policyId }));
				if (direct) return toAttributes(normalizePolicy(direct));
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findPolicyByName(name);
			if (!existing) return undefined;
			return toAttributes(normalizePolicy(existing));
		}),
		list: Effect.fn(function* () {
			const all = yield* policiesGet({});
			return all.map(policy => toAttributes(normalizePolicy(policy)));
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as PolicyProps);
			const name = yield* resolveName(id, props.name);

			let observed: ApiPolicy | undefined;
			if (output?.policyId) {
				const direct = yield* catchNotFound(policiesPolicyIdGet({ policyId: output.policyId }));
				if (direct) observed = normalizePolicy(direct);
			}
			if (!observed) {
				const byName = yield* findPolicyByName(name);
				if (byName) observed = normalizePolicy(byName);
			}

			const description = props.description !== undefined ? props.description : observed?.description;
			const enabled = props.enabled ?? observed?.enabled ?? true;
			const sourcePostureChecks =
				props.sourcePostureChecks !== undefined ? props.sourcePostureChecks : (observed?.source_posture_checks ?? []);
			const apiRules =
				props.rules !== undefined
					? mergeRuleIds(props.rules, observed?.rules ?? [])
					: observedRulesToApi(observed?.rules ?? []);

			if (!observed) {
				if (props.rules === undefined) {
					return yield* Effect.die(new Error('NetBird.Policy requires "rules" when creating a new policy'));
				}
				const created = yield* policiesPost({
					name,
					...(description !== undefined ? { description } : {}),
					enabled,
					source_posture_checks: sourcePostureChecks,
					rules: apiRules,
				}).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findPolicyByName(name);
							if (existing) return normalizePolicy(existing);
							return yield* Effect.fail(err);
						}),
					),
				);
				return toAttributes(normalizePolicy(created));
			}

			const observedPostureChecks = observed.source_posture_checks;
			const postureChecksChanged =
				props.sourcePostureChecks !== undefined &&
				(sourcePostureChecks.length !== observedPostureChecks.length ||
					sourcePostureChecks.some(check => !observedPostureChecks.includes(check)));

			const rulesChanged = props.rules !== undefined && !rulesEqual(apiRules, observed.rules);

			if (
				observed.name !== name ||
				(props.description !== undefined && observed.description !== description) ||
				(props.enabled !== undefined && observed.enabled !== enabled) ||
				postureChecksChanged ||
				rulesChanged
			) {
				const updated = yield* policiesPolicyIdPut({
					policyId: observed.id!,
					name,
					...(description !== undefined ? { description } : {}),
					enabled,
					source_posture_checks: sourcePostureChecks,
					rules: apiRules,
				});
				return toAttributes(normalizePolicy(updated));
			}

			return toAttributes(observed);
		}),
		delete: Effect.fn(function* ({ output }) {
			if (output.name === DEFAULT_POLICY_NAME) return;
			yield* catchNotFoundOrUnavailable(policiesPolicyIdDelete({ policyId: output.policyId }));
		}),
	});

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const findPolicyByName = (name: string) =>
	policiesGet({}).pipe(
		Effect.map(policies => policies.find(policy => policy.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);

const toAttributes = (policy: ApiPolicy): PolicyAttributes => ({
	policyId: policy.id!,
	name: policy.name,
	description: policy.description,
	enabled: policy.enabled,
});

const toApiRule = (rule: PolicyRule, id?: string) => ({
	...(id !== undefined ? { id } : {}),
	name: rule.name,
	...(rule.description !== undefined ? { description: rule.description } : {}),
	enabled: rule.enabled,
	action: rule.action,
	bidirectional: rule.bidirectional,
	protocol: rule.protocol,
	...(rule.ports !== undefined ? { ports: [...rule.ports] } : {}),
	...(rule.portRanges !== undefined
		? { port_ranges: rule.portRanges.map(range => ({ start: range.start, end: range.end })) }
		: {}),
	...(rule.sources !== undefined ? { sources: [...rule.sources] } : {}),
	...(rule.destinations !== undefined ? { destinations: [...rule.destinations] } : {}),
});

const mergeRuleIds = (desired: ReadonlyArray<PolicyRule>, observed: ReadonlyArray<ApiRule>) => {
	const byName = new Map(observed.map(rule => [rule.name, rule.id]));
	return desired.map(rule => toApiRule(rule, byName.get(rule.name)));
};

const observedRulesToApi = (observed: ReadonlyArray<ApiRule>) =>
	observed.map(rule =>
		toApiRule(
			{
				name: rule.name,
				...(rule.description !== undefined ? { description: rule.description } : {}),
				enabled: rule.enabled,
				action: rule.action,
				bidirectional: rule.bidirectional,
				protocol: rule.protocol,
				...(rule.ports !== undefined ? { ports: rule.ports } : {}),
				...(rule.port_ranges !== undefined ? { portRanges: rule.port_ranges } : {}),
				...(rule.sources ? { sources: rule.sources.map(entry => entry.id) } : {}),
				...(rule.destinations ? { destinations: rule.destinations.map(entry => entry.id) } : {}),
			},
			rule.id,
		),
	);

const normalizeRule = (rule: {
	name: string;
	description?: string;
	enabled: boolean;
	action: PolicyAction;
	bidirectional: boolean;
	protocol: PolicyProtocol;
	ports?: ReadonlyArray<string>;
	port_ranges?: ReadonlyArray<PolicyPortRange>;
	sources?: ReadonlyArray<string | { id: string }> | null;
	destinations?: ReadonlyArray<string | { id: string }> | null;
}) =>
	JSON.stringify({
		name: rule.name,
		description: rule.description ?? null,
		enabled: rule.enabled,
		action: rule.action,
		bidirectional: rule.bidirectional,
		protocol: rule.protocol,
		ports: rule.ports ?? null,
		port_ranges: rule.port_ranges ?? null,
		sources: (rule.sources ?? []).map(entry => (typeof entry === "string" ? entry : entry.id)).sort(),
		destinations: (rule.destinations ?? []).map(entry => (typeof entry === "string" ? entry : entry.id)).sort(),
	});

const rulesEqual = (desired: ReadonlyArray<ReturnType<typeof toApiRule>>, observed: ReadonlyArray<ApiRule>) => {
	if (desired.length !== observed.length) return false;
	const observedByName = new Map(observed.map(rule => [rule.name, rule]));
	return desired.every(rule => {
		const live = observedByName.get(rule.name);
		if (!live) return false;
		return normalizeRule(rule) === normalizeRule(live);
	});
};
