import { firewallsGet } from "@yorganci/hetzner-api/firewallsGet";
import { firewallsIdActionsSetRulesPost } from "@yorganci/hetzner-api/firewallsIdActionsSetRulesPost";
import { firewallsIdDelete } from "@yorganci/hetzner-api/firewallsIdDelete";
import { firewallsIdGet } from "@yorganci/hetzner-api/firewallsIdGet";
import { firewallsIdPut } from "@yorganci/hetzner-api/firewallsIdPut";
import { firewallsPost } from "@yorganci/hetzner-api/firewallsPost";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { waitForActions } from "../actions.ts";
import { catchNotFound } from "../errors.ts";

export type FirewallDirection = "in" | "out";
export type FirewallProtocol = "tcp" | "udp" | "icmp" | "esp" | "gre";

export interface FirewallRuleProps {
	direction: FirewallDirection;
	protocol: FirewallProtocol;
	port?: string;
	sourceIps?: ReadonlyArray<string>;
	destinationIps?: ReadonlyArray<string>;
	description?: string;
}

export interface FirewallProps {
	/**
	 * Display name for the firewall. Used as a stable identifier for adoption.
	 * If omitted, a unique name is generated from the stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	/**
	 * User-defined labels.
	 *
	 * @default {}
	 */
	labels?: Record<string, string>;
	/**
	 * Firewall rules. Replaced in full when changed.
	 *
	 * @default []
	 */
	rules?: ReadonlyArray<FirewallRuleProps>;
}

export interface FirewallRuleAttributes {
	direction: FirewallDirection;
	protocol: FirewallProtocol;
	port: string | null;
	sourceIps: ReadonlyArray<string>;
	destinationIps: ReadonlyArray<string>;
	description: string | null;
}

export interface FirewallAttributes {
	/** Numeric ID assigned by Hetzner. */
	firewallId: number;
	/** Display name reported by Hetzner. */
	name: string;
	/** User-defined labels. */
	labels: Record<string, string>;
	/** Current firewall rules. */
	rules: ReadonlyArray<FirewallRuleAttributes>;
}

export type Firewall = Resource<"Hetzner.Firewall", FirewallProps, FirewallAttributes>;

/**
 * A Hetzner Cloud Firewall. Attach to Servers via `Server.firewalls`.
 *
 * @resource
 * @product Firewalls
 * @category Hetzner
 */
export const Firewall = Resource<Firewall>("Hetzner.Firewall");

export const isFirewall = (value: unknown): value is Firewall =>
	Predicate.hasProperty(value, "Type") && value.Type === "Hetzner.Firewall";

export const FirewallProvider = () =>
	Provider.succeed(Firewall, {
		stables: ["firewallId", "name"],
		diff: ({ news }) =>
			Effect.sync(() => {
				if (!isResolved(news)) return undefined;
				// Name, labels, and rules converge in place.
			}),
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.firewallId != null) {
				const direct = yield* catchNotFound(firewallsIdGet({ id: output.firewallId }));
				if (direct?.firewall) return toAttributes(direct.firewall);
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findFirewallByName(name);
			if (!existing) return undefined;
			return toAttributes(existing);
		}),
		list: Effect.fn(function* () {
			const all = yield* firewallsGet({});
			return all.firewalls.map(toAttributes);
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as FirewallProps);
			const name = yield* resolveName(id, props.name);
			const labels = props.labels ?? {};
			const rules = props.rules ?? [];

			let observed: FirewallApi | undefined;
			if (output?.firewallId != null) {
				const direct = yield* catchNotFound(firewallsIdGet({ id: output.firewallId }));
				if (direct?.firewall) observed = direct.firewall;
			}
			if (!observed) {
				observed = yield* findFirewallByName(name);
			}

			if (!observed) {
				const created = yield* firewallsPost({
					name,
					labels,
					rules: rules.map(toApiRule),
				}).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findFirewallByName(name);
							if (existing) return { firewall: existing, actions: undefined };
							return yield* Effect.fail(err);
						}),
					),
				);
				yield* waitForActions(created.actions);
				if (!created.firewall) {
					return yield* Effect.die(new Error(`Hetzner firewall create returned no firewall for ${name}`));
				}
				return toAttributes(created.firewall);
			}

			if (observed.name !== name || !labelsEqual(observed.labels ?? {}, labels)) {
				const updated = yield* firewallsIdPut({
					id: observed.id,
					name,
					labels,
				});
				if (updated.firewall) observed = updated.firewall;
			}

			const desiredApi = rules.map(toApiRule);
			if (!rulesEqual(observed.rules, desiredApi)) {
				const result = yield* firewallsIdActionsSetRulesPost({
					id: observed.id,
					rules: desiredApi,
				});
				yield* waitForActions(result.actions);
				const refreshed = yield* firewallsIdGet({ id: observed.id });
				if (refreshed.firewall) observed = refreshed.firewall;
			}

			return toAttributes(observed);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFound(firewallsIdDelete({ id: output.firewallId }));
		}),
	});

type FirewallApiRule = {
	description?: string | null;
	direction: FirewallDirection;
	source_ips: ReadonlyArray<string>;
	destination_ips: ReadonlyArray<string>;
	protocol: FirewallProtocol;
	port: string | null;
};

type FirewallApi = {
	id: number;
	name: string;
	labels?: Record<string, string>;
	rules: ReadonlyArray<FirewallApiRule>;
};

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const findFirewallByName = (name: string) =>
	firewallsGet({ name }).pipe(
		Effect.map(res => res.firewalls.find(f => f.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);

const toApiRule = (rule: FirewallRuleProps) => {
	const out: {
		direction: FirewallDirection;
		protocol: FirewallProtocol;
		port?: string;
		source_ips?: ReadonlyArray<string>;
		destination_ips?: ReadonlyArray<string>;
		description?: string | null;
	} = {
		direction: rule.direction,
		protocol: rule.protocol,
	};
	if (rule.port !== undefined) out.port = rule.port;
	if (rule.sourceIps !== undefined) out.source_ips = rule.sourceIps;
	if (rule.destinationIps !== undefined) out.destination_ips = rule.destinationIps;
	if (rule.description !== undefined) out.description = rule.description;
	return out;
};

const toAttributes = (fw: FirewallApi): FirewallAttributes => ({
	firewallId: fw.id,
	name: fw.name,
	labels: fw.labels ?? {},
	rules: fw.rules.map(r => ({
		direction: r.direction,
		protocol: r.protocol,
		port: r.port,
		sourceIps: r.source_ips,
		destinationIps: r.destination_ips,
		description: r.description ?? null,
	})),
});

const labelsEqual = (a: Record<string, string>, b: Record<string, string>) => {
	const aKeys = Object.keys(a).sort();
	const bKeys = Object.keys(b).sort();
	if (aKeys.length !== bKeys.length) return false;
	return aKeys.every((k, i) => k === bKeys[i] && a[k] === b[k]);
};

const normalizeRule = (r: {
	direction: FirewallDirection;
	protocol: FirewallProtocol;
	port?: string | null;
	source_ips?: ReadonlyArray<string>;
	destination_ips?: ReadonlyArray<string>;
	description?: string | null;
}) =>
	JSON.stringify({
		direction: r.direction,
		protocol: r.protocol,
		port: r.port ?? null,
		source_ips: [...(r.source_ips ?? [])].sort(),
		destination_ips: [...(r.destination_ips ?? [])].sort(),
		description: r.description ?? null,
	});

const rulesEqual = (
	observed: ReadonlyArray<FirewallApiRule>,
	desired: ReadonlyArray<{
		direction: FirewallDirection;
		protocol: FirewallProtocol;
		port?: string;
		source_ips?: ReadonlyArray<string>;
		destination_ips?: ReadonlyArray<string>;
		description?: string | null;
	}>,
) => {
	if (observed.length !== desired.length) return false;
	const a = observed.map(normalizeRule).sort();
	const b = desired.map(normalizeRule).sort();
	return a.every((v, i) => v === b[i]);
};
