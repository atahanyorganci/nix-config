import { primaryIpsGet } from "@yorganci/hetzner-api/primaryIpsGet";
import { primaryIpsIdDelete } from "@yorganci/hetzner-api/primaryIpsIdDelete";
import { primaryIpsIdGet } from "@yorganci/hetzner-api/primaryIpsIdGet";
import { primaryIpsIdPut } from "@yorganci/hetzner-api/primaryIpsIdPut";
import { primaryIpsPost } from "@yorganci/hetzner-api/primaryIpsPost";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { waitForActions } from "../actions.ts";
import { catchNotFound } from "../errors.ts";

export type PrimaryIpType = "ipv4" | "ipv6";

export interface PrimaryIpProps {
	/**
	 * Display name for the Primary IP. Used as a stable identifier for adoption.
	 * If omitted, a unique name is generated from the stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	/**
	 * Address family.
	 *
	 * @default "ipv4"
	 */
	type?: PrimaryIpType;
	/**
	 * Location name or ID where the IP is allocated. Required when creating an
	 * unassigned Primary IP. Changing this replaces the resource.
	 */
	location: string | number;
	/**
	 * User-defined labels.
	 *
	 * @default {}
	 */
	labels?: Record<string, string>;
	/**
	 * Whether to delete this Primary IP when its assignee Server is deleted.
	 *
	 * @default false
	 */
	autoDelete?: boolean;
}

export interface PrimaryIpAttributes {
	/** Numeric ID assigned by Hetzner. */
	primaryIpId: number;
	/** Display name reported by Hetzner. */
	name: string;
	/** Address family. */
	type: PrimaryIpType;
	/** Allocated IP address. */
	ip: string;
	/** Location name where the IP lives. */
	location: string;
	/** User-defined labels. */
	labels: Record<string, string>;
	/** Whether the IP is deleted with its assignee Server. */
	autoDelete: boolean;
}

export type PrimaryIp = Resource<"Hetzner.PrimaryIp", PrimaryIpProps, PrimaryIpAttributes>;

/**
 * A Hetzner Cloud Primary IP. Create unassigned, then attach via `Server.primaryIpv4Id`.
 *
 * @resource
 * @product Primary IPs
 * @category Hetzner
 */
export const PrimaryIp = Resource<PrimaryIp>("Hetzner.PrimaryIp");

export const isPrimaryIp = (value: unknown): value is PrimaryIp =>
	Predicate.hasProperty(value, "Type") && value.Type === "Hetzner.PrimaryIp";

export const PrimaryIpProvider = () =>
	Provider.succeed(PrimaryIp, {
		stables: ["primaryIpId", "name"],
		diff: ({ news, olds }) =>
			Effect.sync(() => {
				if (!isResolved(news) || !olds) return undefined;
				const type = news.type ?? "ipv4";
				const prevType = olds.type ?? "ipv4";
				if (type !== prevType || String(news.location) !== String(olds.location)) {
					return { action: "replace" } as const;
				}
			}),
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.primaryIpId != null) {
				const direct = yield* catchNotFound(primaryIpsIdGet({ id: output.primaryIpId }));
				if (direct) return toAttributes(direct.primary_ip);
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findPrimaryIpByName(name);
			if (!existing) return undefined;
			return toAttributes(existing);
		}),
		list: Effect.fn(function* () {
			const all = yield* primaryIpsGet({});
			return all.primary_ips.map(toAttributes);
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as PrimaryIpProps);
			const name = yield* resolveName(id, props.name);
			const type = props.type ?? "ipv4";
			const labels = props.labels ?? {};
			const autoDelete = props.autoDelete ?? false;
			const location = props.location;

			let observed: PrimaryIpApi | undefined;
			if (output?.primaryIpId != null) {
				const direct = yield* catchNotFound(primaryIpsIdGet({ id: output.primaryIpId }));
				if (direct) observed = direct.primary_ip;
			}
			if (!observed) {
				observed = yield* findPrimaryIpByName(name);
			}

			if (!observed) {
				const created = yield* primaryIpsPost({
					name,
					type,
					location,
					labels,
					auto_delete: autoDelete,
				}).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findPrimaryIpByName(name);
							if (existing) return { primary_ip: existing, action: null };
							return yield* Effect.fail(err);
						}),
					),
				);
				yield* waitForActions(created.action ? [created.action] : []);
				return toAttributes(created.primary_ip);
			}

			if (observed.name !== name || !labelsEqual(observed.labels, labels) || observed.auto_delete !== autoDelete) {
				const updated = yield* primaryIpsIdPut({
					id: observed.id,
					name,
					labels,
					auto_delete: autoDelete,
				});
				return toAttributes(updated.primary_ip);
			}

			return toAttributes(observed);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFound(primaryIpsIdDelete({ id: output.primaryIpId }));
		}),
	});

type PrimaryIpApi = {
	id: number;
	name: string;
	labels: Record<string, string>;
	location: { name: string };
	ip: string;
	type: PrimaryIpType;
	auto_delete: boolean;
};

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const findPrimaryIpByName = (name: string) =>
	primaryIpsGet({ name }).pipe(
		Effect.map(res => res.primary_ips.find(ip => ip.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);

const toAttributes = (ip: PrimaryIpApi): PrimaryIpAttributes => ({
	primaryIpId: ip.id,
	name: ip.name,
	type: ip.type,
	ip: ip.ip,
	location: ip.location.name,
	labels: ip.labels,
	autoDelete: ip.auto_delete,
});

const labelsEqual = (a: Record<string, string>, b: Record<string, string>) => {
	const aKeys = Object.keys(a).sort();
	const bKeys = Object.keys(b).sort();
	if (aKeys.length !== bKeys.length) return false;
	return aKeys.every((k, i) => k === bKeys[i] && a[k] === b[k]);
};
