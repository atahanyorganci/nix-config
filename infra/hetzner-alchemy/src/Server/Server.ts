import { firewallsIdActionsApplyToResourcesPost } from "@yorganci/hetzner-api/firewallsIdActionsApplyToResourcesPost";
import { firewallsIdActionsRemoveFromResourcesPost } from "@yorganci/hetzner-api/firewallsIdActionsRemoveFromResourcesPost";
import { serversGet } from "@yorganci/hetzner-api/serversGet";
import { serversIdDelete } from "@yorganci/hetzner-api/serversIdDelete";
import { serversIdGet } from "@yorganci/hetzner-api/serversIdGet";
import { serversIdPut } from "@yorganci/hetzner-api/serversIdPut";
import { serversPost } from "@yorganci/hetzner-api/serversPost";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { waitForActions } from "../actions.ts";
import { catchNotFound } from "../errors.ts";

export interface ServerProps {
	/**
	 * Hostname for the server. Used as a stable identifier for adoption.
	 * If omitted, a unique name is generated from the stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	/** Server type name (e.g. `cx22`). Changing this replaces the server. */
	serverType: string;
	/** Image name or ID (e.g. `ubuntu-24.04`). Changing this replaces the server. */
	image: string;
	/** Location name (e.g. `nbg1`). Changing this replaces the server. */
	location: string;
	/**
	 * SSH key names or ID strings to inject at create time.
	 *
	 * @default []
	 */
	sshKeys?: ReadonlyArray<string>;
	/**
	 * Firewall IDs to apply to this server.
	 *
	 * @default []
	 */
	firewalls?: ReadonlyArray<number>;
	/**
	 * Existing Primary IPv4 ID to attach at create. Changing this replaces the server.
	 */
	primaryIpv4Id?: number;
	/**
	 * Whether to enable auto-allocated IPv6.
	 *
	 * @default false
	 */
	enableIpv6?: boolean;
	/**
	 * User-defined labels.
	 *
	 * @default {}
	 */
	labels?: Record<string, string>;
	/** Cloud-init user data. */
	userData?: string;
}

export interface ServerAttributes {
	/** Numeric ID assigned by Hetzner. */
	serverId: number;
	/** Hostname reported by Hetzner. */
	name: string;
	/** Server type name. */
	serverType: string;
	/** Image name (or ID string if name is null). */
	image: string;
	/** Location name. */
	location: string;
	/** Public IPv4 address, if any. */
	ipv4: string | null;
	/** Primary IPv4 resource ID, if any. */
	primaryIpv4Id: number | null;
	/** SSH keys requested at create (names/IDs). */
	sshKeys: ReadonlyArray<string>;
	/** Firewall IDs currently applied. */
	firewalls: ReadonlyArray<number>;
	/** User-defined labels. */
	labels: Record<string, string>;
}

export type Server = Resource<"Hetzner.Server", ServerProps, ServerAttributes>;

/**
 * A Hetzner Cloud Server (VM). Attach SSH keys, firewalls, and a stable
 * Primary IPv4 at create time for SSH access.
 *
 * @resource
 * @product Servers
 * @category Hetzner
 */
export const Server = Resource<Server>("Hetzner.Server");

export const isServer = (value: unknown): value is Server =>
	Predicate.hasProperty(value, "Type") && value.Type === "Hetzner.Server";

export const ServerProvider = () =>
	Provider.succeed(Server, {
		stables: ["serverId", "name"],
		diff: ({ news, olds }) =>
			Effect.sync(() => {
				if (!isResolved(news) || !olds) return undefined;
				if (
					news.serverType !== olds.serverType ||
					news.image !== olds.image ||
					news.location !== olds.location ||
					(news.primaryIpv4Id ?? null) !== (olds.primaryIpv4Id ?? null)
				) {
					return { action: "replace" } as const;
				}
			}),
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.serverId != null) {
				const direct = yield* catchNotFound(serversIdGet({ id: output.serverId }));
				if (direct?.server) {
					return toAttributes(direct.server, output.sshKeys ?? olds?.sshKeys ?? []);
				}
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findServerByName(name);
			if (!existing) return undefined;
			return toAttributes(existing, output?.sshKeys ?? olds?.sshKeys ?? []);
		}),
		list: Effect.fn(function* () {
			const all = yield* serversGet({});
			return (all.servers ?? []).map(s => toAttributes(s, []));
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as ServerProps);
			const name = yield* resolveName(id, props.name);
			const labels = props.labels ?? {};
			const sshKeys = props.sshKeys ?? [];
			const firewalls = props.firewalls ?? [];
			const enableIpv6 = props.enableIpv6 ?? false;
			const primaryIpv4Id = props.primaryIpv4Id;

			let observed: ServerApi | undefined;
			if (output?.serverId != null) {
				const direct = yield* catchNotFound(serversIdGet({ id: output.serverId }));
				if (direct?.server) observed = direct.server;
			}
			if (!observed) {
				observed = yield* findServerByName(name);
			}

			if (!observed) {
				const createInput: Parameters<typeof serversPost>[0] = {
					name,
					server_type: props.serverType,
					image: props.image,
					location: props.location,
					labels,
					public_net: {
						enable_ipv4: true,
						enable_ipv6: enableIpv6,
						ipv4: primaryIpv4Id ?? null,
					},
				};
				if (sshKeys.length > 0) createInput.ssh_keys = [...sshKeys];
				if (firewalls.length > 0) createInput.firewalls = firewalls.map(firewall => ({ firewall }));
				if (props.userData !== undefined) createInput.user_data = props.userData;

				const created = yield* serversPost(createInput).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findServerByName(name);
							if (existing) {
								return {
									server: existing,
									action: undefined,
									next_actions: [],
								};
							}
							return yield* Effect.fail(err);
						}),
					),
				);
				yield* waitForActions([created.action, ...(created.next_actions ?? [])]);
				const live = yield* serversIdGet({ id: created.server.id });
				return toAttributes(live.server ?? created.server, sshKeys);
			}

			if (observed.name !== name || !labelsEqual(observed.labels, labels)) {
				const updated = yield* serversIdPut({
					id: observed.id,
					name,
					labels,
				});
				if (updated.server) observed = updated.server;
			}

			const applied = appliedFirewallIds(observed);
			const toAdd = firewalls.filter(fid => !applied.includes(fid));
			const toRemove = applied.filter(fid => !firewalls.includes(fid));

			for (const firewallId of toAdd) {
				const result = yield* firewallsIdActionsApplyToResourcesPost({
					id: firewallId,
					apply_to: [{ type: "server", server: { id: observed.id } }],
				});
				yield* waitForActions(result.actions);
			}
			for (const firewallId of toRemove) {
				const result = yield* firewallsIdActionsRemoveFromResourcesPost({
					id: firewallId,
					remove_from: [{ type: "server", server: { id: observed.id } }],
				});
				yield* waitForActions(result.actions);
			}

			if (toAdd.length > 0 || toRemove.length > 0) {
				const refreshed = yield* serversIdGet({ id: observed.id });
				if (refreshed.server) observed = refreshed.server;
			}

			return toAttributes(observed, sshKeys);
		}),
		delete: Effect.fn(function* ({ output }) {
			const result = yield* catchNotFound(serversIdDelete({ id: output.serverId }));
			if (result?.action) {
				yield* waitForActions([result.action]);
			}
		}),
	});

type ServerApi = {
	id: number;
	name: string;
	labels: Record<string, string>;
	public_net: {
		ipv4: { id?: number; ip: string } | null;
		firewalls?: ReadonlyArray<{ id?: number }>;
	};
	server_type: { name: string };
	location: { name: string };
	image: { id: number; name: string | null } | null;
};

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const findServerByName = (name: string) =>
	serversGet({ name }).pipe(
		Effect.map(res => (res.servers ?? []).find(s => s.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);

const appliedFirewallIds = (server: ServerApi): number[] =>
	(server.public_net.firewalls ?? []).flatMap(f => (f.id != null ? [f.id] : []));

const toAttributes = (server: ServerApi, sshKeys: ReadonlyArray<string>): ServerAttributes => ({
	serverId: server.id,
	name: server.name,
	serverType: server.server_type.name,
	image: server.image?.name ?? (server.image ? String(server.image.id) : ""),
	location: server.location.name,
	ipv4: server.public_net.ipv4?.ip ?? null,
	primaryIpv4Id: server.public_net.ipv4?.id ?? null,
	sshKeys: [...sshKeys],
	firewalls: appliedFirewallIds(server),
	labels: server.labels,
});

const labelsEqual = (a: Record<string, string>, b: Record<string, string>) => {
	const aKeys = Object.keys(a).sort();
	const bKeys = Object.keys(b).sort();
	if (aKeys.length !== bKeys.length) return false;
	return aKeys.every((k, i) => k === bKeys[i] && a[k] === b[k]);
};
