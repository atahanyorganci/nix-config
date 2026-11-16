import {
	type GroupIssued,
	groupsGet,
	groupsGroupIdDelete,
	groupsGroupIdGet,
	groupsGroupIdPut,
	groupsPost,
} from "@yorganci/netbird-api/groups";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound, isBadRequest, isNotFound, isTransportError } from "../errors.ts";

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
	 * When set (including `[]`), membership is replaced on reconcile.
	 * When omitted (`undefined`), the provider creates an empty group if
	 * needed but does not rewrite existing members — use this for
	 * user-role groups populated via NetBird user `auto_groups`.
	 */
	peers?: ReadonlyArray<string>;
	/**
	 * Create the group when none has its name. With `false` the group is
	 * only adopted, and a missing one fails the deploy: for a group that
	 * something else has to create, such as a JWT group, which NetBird
	 * creates at a login and the API never can.
	 *
	 * @default true
	 */
	create?: boolean;
	/**
	 * How the adopted group must have been issued (`api`, `integration` or
	 * `jwt`); a group issued any other way fails the deploy. JWT group sync
	 * only ever adds users to groups issued by `jwt`, so a same-named group
	 * created through the API would silently stop it.
	 */
	issued?: GroupIssued;
}

export interface GroupAttributes {
	/** UUID of the group assigned by NetBird. */
	groupId: string;
	/** Display name reported by NetBird. */
	name: string;
	/** How the group was issued: `api`, `integration` or `jwt`. */
	issued?: GroupIssued;
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
 *
 * @example Adopt a group JWT group sync created
 * ```typescript
 * const admins = yield* NetBird.Group("Admin", {
 *   name: "Admin",
 *   create: false,
 *   issued: "jwt",
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
					return toAttributes(direct);
				}
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findGroupByName(name);
			if (!existing) return undefined;
			return toAttributes(existing);
		}),
		list: Effect.fn(function* () {
			const all = yield* groupsGet({});
			return all.map(toAttributes);
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as GroupProps);
			const name = yield* resolveName(id, props.name);
			const managePeers = props.peers !== undefined;
			const peers = props.peers ?? [];

			let observed:
				| { id: string; name: string; issued?: GroupIssued; peers: ReadonlyArray<{ id: string }> }
				| undefined;
			if (output?.groupId) {
				const direct = yield* catchNotFound(groupsGroupIdGet({ groupId: output.groupId }));
				if (direct) {
					observed = {
						id: direct.id,
						name: direct.name,
						...(direct.issued !== undefined ? { issued: direct.issued } : {}),
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
						...(byName.issued !== undefined ? { issued: byName.issued } : {}),
						peers: byName.peers ?? [],
					};
				}
			}

			if (!observed && props.create === false) {
				return yield* Effect.die(
					new Error(
						`NetBird.Group: no group is named "${name}", and this one is only adopted (create: false)` +
							(props.issued === "jwt"
								? "; JWT group sync creates it when a member first signs in through the identity provider"
								: ""),
					),
				);
			}

			if (observed && props.issued !== undefined && observed.issued !== props.issued) {
				return yield* Effect.die(
					new Error(
						`NetBird.Group: group "${observed.name}" was issued by ${observed.issued ?? "an unknown source"}, not ${props.issued}`,
					),
				);
			}

			if (!observed) {
				const created = yield* groupsPost({ name, peers: managePeers ? peers : [] }).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findGroupByName(name);
							if (existing) return existing;
							return yield* Effect.fail(err);
						}),
					),
				);
				return toAttributes(created);
			}

			if (!managePeers) {
				if (observed.name !== name) {
					const updated = yield* groupsGroupIdPut({
						groupId: observed.id,
						name,
					});
					return toAttributes(updated);
				}
				return toAttributes(observed);
			}

			const peerIds = observed.peers.map(p => p.id);
			const peersChanged = peers.length !== peerIds.length || peers.some(p => !peerIds.includes(p));
			if (observed.name !== name || peersChanged) {
				const updated = yield* groupsGroupIdPut({
					groupId: observed.id,
					name,
					peers,
				});
				return toAttributes(updated);
			}

			return toAttributes(observed);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* groupsGroupIdDelete({ groupId: output.groupId }).pipe(
				Effect.catchIf(
					error =>
						isNotFound(error) ||
						isTransportError(error) ||
						(isBadRequest(error) && error.message.includes("linked to policy")),
					() => Effect.succeed(undefined),
				),
			);
		}),
	});

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const toAttributes = (group: { id: string; name: string; issued?: GroupIssued }): GroupAttributes => ({
	groupId: group.id,
	name: group.name,
	...(group.issued !== undefined ? { issued: group.issued } : {}),
});

const findGroupByName = (name: string) =>
	groupsGet({ name }).pipe(
		Effect.map(groups => groups.find(g => g.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);
