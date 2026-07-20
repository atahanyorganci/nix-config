import { networksGet } from "@yorganci/netbird-api/networksGet";
import { networksNetworkIdDelete } from "@yorganci/netbird-api/networksNetworkIdDelete";
import { networksNetworkIdGet } from "@yorganci/netbird-api/networksNetworkIdGet";
import { networksNetworkIdPut } from "@yorganci/netbird-api/networksNetworkIdPut";
import { networksPost } from "@yorganci/netbird-api/networksPost";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound } from "../errors.ts";

export interface NetworkProps {
	/**
	 * Display name for the network. Used as a stable identifier so the
	 * provider can locate the network by name during adoption / state
	 * recovery. If omitted, a unique name is generated from the
	 * stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	/**
	 * Human-readable description shown in the NetBird dashboard.
	 */
	description?: string;
}

export interface NetworkAttributes {
	/** UUID of the network assigned by NetBird. */
	networkId: string;
	/** Display name reported by NetBird. */
	name: string;
	/** Description reported by NetBird. */
	description: string | undefined;
}

export type Network = Resource<"NetBird.Network", NetworkProps, NetworkAttributes>;

/**
 * A NetBird network — a logical container for routers, resources, and
 * policies that share a routing domain.
 *
 * @resource
 * @product Networks
 * @category NetBird
 * @section Creating a Network
 * @example Named network with a description
 * ```typescript
 * const network = yield* NetBird.Network("Homelab", {
 *   name: "homelab",
 *   description: "Home lab overlay",
 * });
 * ```
 */
export const Network = Resource<Network>("NetBird.Network");

export const isNetwork = (value: unknown): value is Network =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.Network";

export const NetworkProvider = () =>
	Provider.succeed(Network, {
		stables: ["networkId", "name"],
		diff: ({ news }) =>
			Effect.sync(() => {
				if (!isResolved(news)) return undefined;
				// Name and description converge via PUT — no replacement.
			}),
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.networkId) {
				const direct = yield* catchNotFound(networksNetworkIdGet({ networkId: output.networkId }));
				if (direct) {
					return {
						networkId: direct.id,
						name: direct.name,
						description: direct.description,
					};
				}
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findNetworkByName(name);
			if (!existing) return undefined;
			return {
				networkId: existing.id,
				name: existing.name,
				description: existing.description,
			};
		}),
		list: Effect.fn(function* () {
			const all = yield* networksGet({});
			return all.map(n => ({
				networkId: n.id,
				name: n.name,
				description: n.description,
			}));
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as NetworkProps);
			const name = yield* resolveName(id, props.name);
			const description = props.description;

			let observed: { id: string; name: string; description: string | undefined } | undefined;
			if (output?.networkId) {
				const direct = yield* catchNotFound(networksNetworkIdGet({ networkId: output.networkId }));
				if (direct) {
					observed = {
						id: direct.id,
						name: direct.name,
						description: direct.description,
					};
				}
			}
			if (!observed) {
				const byName = yield* findNetworkByName(name);
				if (byName) {
					observed = {
						id: byName.id,
						name: byName.name,
						description: byName.description,
					};
				}
			}

			if (!observed) {
				const created = yield* networksPost({
					name,
					...(description !== undefined ? { description } : {}),
				}).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findNetworkByName(name);
							if (existing) return existing;
							return yield* Effect.fail(err);
						}),
					),
				);
				return {
					networkId: created.id,
					name: created.name,
					description: created.description,
				};
			}

			if (observed.name !== name || observed.description !== description) {
				const updated = yield* networksNetworkIdPut({
					networkId: observed.id,
					name,
					...(description !== undefined ? { description } : {}),
				});
				return {
					networkId: updated.id,
					name: updated.name,
					description: updated.description,
				};
			}

			return {
				networkId: observed.id,
				name: observed.name,
				description: observed.description,
			};
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFound(networksNetworkIdDelete({ networkId: output.networkId }));
		}),
	});

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const findNetworkByName = (name: string) =>
	networksGet({}).pipe(
		Effect.map(networks => networks.find(n => n.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);
