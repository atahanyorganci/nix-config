import { dnsNameserversGet } from "@yorganci/netbird-api/dnsNameserversGet";
import { dnsNameserversNsgroupIdDelete } from "@yorganci/netbird-api/dnsNameserversNsgroupIdDelete";
import { dnsNameserversNsgroupIdGet } from "@yorganci/netbird-api/dnsNameserversNsgroupIdGet";
import { dnsNameserversNsgroupIdPut } from "@yorganci/netbird-api/dnsNameserversNsgroupIdPut";
import { dnsNameserversPost } from "@yorganci/netbird-api/dnsNameserversPost";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound, catchNotFoundOrUnavailable } from "../errors.ts";

export interface Nameserver {
	ip: string;
	ns_type: "udp";
	port: number;
}

export interface NameserverGroupProps {
	/**
	 * Display name for the nameserver group. Used as a stable identifier so the
	 * provider can locate the group by name during adoption / state recovery.
	 * If omitted, a unique name is generated from the stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	/**
	 * Human-readable description shown in the NetBird dashboard.
	 */
	description: string;
	/**
	 * Upstream nameservers (1–3) distributed to matching peers.
	 */
	nameservers: ReadonlyArray<Nameserver>;
	/**
	 * Whether this nameserver group is active.
	 */
	enabled: boolean;
	/**
	 * Peer group IDs that should receive these nameservers.
	 */
	groups: ReadonlyArray<string>;
	/**
	 * When true, this group is the primary resolver for all non-NetBird queries
	 * and `domains` must be empty.
	 */
	primary: boolean;
	/**
	 * Match domains for split-horizon DNS. Must be empty when `primary` is true.
	 */
	domains: ReadonlyArray<string>;
	/**
	 * Whether to push match domains as search domains. Only valid when
	 * `domains` is non-empty.
	 */
	search_domains_enabled: boolean;
}

export interface NameserverGroupAttributes {
	/** UUID of the nameserver group assigned by NetBird. */
	nsgroupId: string;
	/** Display name reported by NetBird. */
	name: string;
	/** Description reported by NetBird. */
	description: string;
	/** Nameservers reported by NetBird. */
	nameservers: ReadonlyArray<Nameserver>;
	/** Whether the group is enabled. */
	enabled: boolean;
	/** Distribution group IDs. */
	groups: ReadonlyArray<string>;
	/** Whether this is a primary nameserver group. */
	primary: boolean;
	/** Match domains. */
	domains: ReadonlyArray<string>;
	/** Whether search domains are enabled. */
	search_domains_enabled: boolean;
}

export type NameserverGroup = Resource<"NetBird.NameserverGroup", NameserverGroupProps, NameserverGroupAttributes>;

/**
 * A NetBird DNS nameserver group — distributes upstream resolvers to peers
 * in selected groups. Primary groups handle all non-NetBird DNS queries.
 *
 * @resource
 * @product DNS
 * @category NetBird
 * @section Creating a Nameserver Group
 * @example Primary Pi-hole nameserver for all peers
 * ```typescript
 * const ns = yield* NetBird.NameserverGroup("PiholePrimary", {
 *   name: "pihole-primary",
 *   description: "Pi-hole filtered DNS",
 *   nameservers: [{ ip: "100.64.0.1", ns_type: "udp", port: 53 }],
 *   enabled: true,
 *   groups: [allGroup.id],
 *   primary: true,
 *   domains: [],
 *   search_domains_enabled: false,
 * });
 * ```
 */
export const NameserverGroup = Resource<NameserverGroup>("NetBird.NameserverGroup");

export const isNameserverGroup = (value: unknown): value is NameserverGroup =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.NameserverGroup";

type ApiNameserverGroup = {
	id: string;
	name: string;
	description: string;
	nameservers: ReadonlyArray<Nameserver>;
	enabled: boolean;
	groups: ReadonlyArray<string>;
	primary: boolean;
	domains: ReadonlyArray<string>;
	search_domains_enabled: boolean;
};

const toAttributes = (group: ApiNameserverGroup): NameserverGroupAttributes => ({
	nsgroupId: group.id,
	name: group.name,
	description: group.description,
	nameservers: group.nameservers,
	enabled: group.enabled,
	groups: group.groups,
	primary: group.primary,
	domains: group.domains,
	search_domains_enabled: group.search_domains_enabled,
});

const sameStringSet = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) => {
	if (a.length !== b.length) return false;
	const set = new Set(a);
	return b.every(item => set.has(item));
};

const sameNameservers = (a: ReadonlyArray<Nameserver>, b: ReadonlyArray<Nameserver>) => {
	if (a.length !== b.length) return false;
	return a.every((ns, i) => {
		const other = b[i]!;
		return ns.ip === other.ip && ns.port === other.port && ns.ns_type === other.ns_type;
	});
};

const hasDrift = (observed: ApiNameserverGroup, desired: {
	name: string;
	description: string;
	nameservers: ReadonlyArray<Nameserver>;
	enabled: boolean;
	groups: ReadonlyArray<string>;
	primary: boolean;
	domains: ReadonlyArray<string>;
	search_domains_enabled: boolean;
}) =>
	observed.name !== desired.name ||
	observed.description !== desired.description ||
	observed.enabled !== desired.enabled ||
	observed.primary !== desired.primary ||
	observed.search_domains_enabled !== desired.search_domains_enabled ||
	!sameNameservers(observed.nameservers, desired.nameservers) ||
	!sameStringSet(observed.groups, desired.groups) ||
	!sameStringSet(observed.domains, desired.domains);

export const NameserverGroupProvider = () =>
	Provider.succeed(NameserverGroup, {
		stables: ["nsgroupId", "name"],
		diff: ({ news }) =>
			Effect.sync(() => {
				if (!isResolved(news)) return undefined;
				// All fields converge via PUT — no replacement.
			}),
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.nsgroupId) {
				const direct = yield* catchNotFound(dnsNameserversNsgroupIdGet({ nsgroupId: output.nsgroupId }));
				if (direct) return toAttributes(direct);
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findNameserverGroupByName(name);
			if (!existing) return undefined;
			return toAttributes(existing);
		}),
		list: Effect.fn(function* () {
			const all = yield* dnsNameserversGet({});
			return all.map(toAttributes);
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as NameserverGroupProps);
			const name = yield* resolveName(id, props.name);
			const desired = {
				name,
				description: props.description,
				nameservers: props.nameservers,
				enabled: props.enabled,
				groups: props.groups,
				primary: props.primary,
				domains: props.domains,
				search_domains_enabled: props.search_domains_enabled,
			};

			let observed: ApiNameserverGroup | undefined;
			if (output?.nsgroupId) {
				const direct = yield* catchNotFound(dnsNameserversNsgroupIdGet({ nsgroupId: output.nsgroupId }));
				if (direct) observed = direct;
			}
			if (!observed) {
				observed = yield* findNameserverGroupByName(name);
			}

			if (!observed) {
				const created = yield* dnsNameserversPost(desired).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findNameserverGroupByName(name);
							if (existing) return existing;
							return yield* Effect.fail(err);
						}),
					),
				);
				return toAttributes(created);
			}

			if (hasDrift(observed, desired)) {
				const updated = yield* dnsNameserversNsgroupIdPut({
					nsgroupId: observed.id,
					...desired,
				});
				return toAttributes(updated);
			}

			return toAttributes(observed);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFoundOrUnavailable(dnsNameserversNsgroupIdDelete({ nsgroupId: output.nsgroupId }));
		}),
	});

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 40 });
	});

const findNameserverGroupByName = (name: string) =>
	dnsNameserversGet({}).pipe(
		Effect.map(groups => groups.find(g => g.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);
