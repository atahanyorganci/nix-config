import { groupsGet } from "@yorganci/netbird-api/groupsGet";
import { groupsGroupIdDelete } from "@yorganci/netbird-api/groupsGroupIdDelete";
import { groupsGroupIdGet } from "@yorganci/netbird-api/groupsGroupIdGet";
import { groupsGroupIdPut } from "@yorganci/netbird-api/groupsGroupIdPut";
import { groupsPost } from "@yorganci/netbird-api/groupsPost";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound } from "../errors.ts";

export interface GroupProps {
	/**
	 * Display name for the group. Used as a stable identifier so the
	 * provider can locate the group by name during adoption / state
	 * recovery. If omitted, a unique name is generated from the
	 * stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	/**
	 * Peer IDs that should be members of this group.
	 *
	 * @default []
	 */
	peers?: ReadonlyArray<string>;
}

export interface GroupAttributes {
	/** UUID of the group assigned by NetBird. */
	groupId: string;
	/** Display name reported by NetBird. */
	name: string;
}

export type Group = Resource<"NetBird.Group", GroupProps, GroupAttributes>;

/**
 * A NetBird peer group — a named set of peers referenced by routes,
 * DNS nameserver groups, policies, and setup keys.
 *
 * @resource
 * @product Groups
 * @category NetBird
 * @section Creating a Group
 * @example Empty group with an explicit name
 * ```typescript
 * const group = yield* NetBird.Group("InfraPeers", {
 *   name: "infra-peers",
 * });
 * ```
 *
 * @example Group with peer membership
 * ```typescript
 * const group = yield* NetBird.Group("Servers", {
 *   name: "servers",
 *   peers: ["peer-id-1", "peer-id-2"],
 * });
 * ```
 */
export const Group = Resource<Group>("NetBird.Group");

export const isGroup = (value: unknown): value is Group =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.Group";

export const GroupProvider = () =>
	Provider.succeed(Group, {
		stables: ["groupId", "name"],
		diff: ({ news }) =>
			Effect.sync(() => {
				if (!isResolved(news)) return undefined;
				// Name and peers converge via PUT — no replacement.
			}),
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.groupId) {
				const direct = yield* catchNotFound(groupsGroupIdGet({ groupId: output.groupId }));
				if (direct) {
					return { groupId: direct.id, name: direct.name };
				}
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findGroupByName(name);
			if (!existing) return undefined;
			return { groupId: existing.id, name: existing.name };
		}),
		list: Effect.fn(function* () {
			const all = yield* groupsGet({});
			return all.map(g => ({ groupId: g.id, name: g.name }));
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as GroupProps);
			const name = yield* resolveName(id, props.name);
			const peers = props.peers ?? [];

			let observed: { id: string; name: string; peers: ReadonlyArray<{ id: string }> } | undefined;
			if (output?.groupId) {
				const direct = yield* catchNotFound(groupsGroupIdGet({ groupId: output.groupId }));
				if (direct) {
					observed = {
						id: direct.id,
						name: direct.name,
						peers: direct.peers ?? [],
					};
				}
			}
			if (!observed) {
				const byName = yield* findGroupByName(name);
				if (byName) {
					observed = {
						id: byName.id,
						name: byName.name,
						peers: byName.peers ?? [],
					};
				}
			}

			if (!observed) {
				const created = yield* groupsPost({ name, peers }).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findGroupByName(name);
							if (existing) return existing;
							return yield* Effect.fail(err);
						}),
					),
				);
				return { groupId: created.id, name: created.name };
			}

			const peerIds = observed.peers.map(p => p.id);
			const peersChanged = peers.length !== peerIds.length || peers.some(p => !peerIds.includes(p));
			if (observed.name !== name || peersChanged) {
				const updated = yield* groupsGroupIdPut({
					groupId: observed.id,
					name,
					peers,
				});
				return { groupId: updated.id, name: updated.name };
			}

			return { groupId: observed.id, name: observed.name };
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFound(groupsGroupIdDelete({ groupId: output.groupId }));
		}),
	});

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const findGroupByName = (name: string) =>
	groupsGet({ name }).pipe(
		Effect.map(groups => groups.find(g => g.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);
