import { setupKeysGet } from "@yorganci/netbird-api/setupKeysGet";
import { setupKeysKeyIdDelete } from "@yorganci/netbird-api/setupKeysKeyIdDelete";
import { setupKeysKeyIdGet } from "@yorganci/netbird-api/setupKeysKeyIdGet";
import { setupKeysKeyIdPut } from "@yorganci/netbird-api/setupKeysKeyIdPut";
import { setupKeysPost } from "@yorganci/netbird-api/setupKeysPost";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";
import { catchNotFound } from "../errors.ts";

export type SetupKeyType = "reusable" | "one-off";

export interface SetupKeyProps {
	/**
	 * Display name for the setup key. Used as a stable identifier so the
	 * provider can locate the key by name during adoption / state recovery.
	 * If omitted, a unique name is generated from the stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	/**
	 * Key type. Changing this replaces the key.
	 *
	 * @default "reusable"
	 */
	type?: SetupKeyType;
	/**
	 * Lifetime of the key in seconds from creation. Changing this replaces
	 * the key.
	 *
	 * @default 86400
	 */
	expiresIn?: number;
	/**
	 * Group IDs automatically assigned to peers that join with this key.
	 * Mutable in place via the NetBird update API.
	 *
	 * @default []
	 */
	autoGroups?: ReadonlyArray<string>;
	/**
	 * Maximum number of times the key can be used (`0` = unlimited). Changing
	 * this replaces the key.
	 *
	 * @default 0
	 */
	usageLimit?: number;
	/**
	 * Whether peers registered with this key are ephemeral. Changing this
	 * replaces the key.
	 *
	 * @default false
	 */
	ephemeral?: boolean;
	/**
	 * Whether extra DNS labels are allowed on peers that join with this key.
	 * Changing this replaces the key.
	 *
	 * @default false
	 */
	allowExtraDnsLabels?: boolean;
}

export interface SetupKeyAttributes {
	/** UUID of the setup key assigned by NetBird. */
	keyId: string;
	/** Display name reported by NetBird. */
	name: string;
	/** Secret setup key value (only fully available on create). */
	key: Redacted.Redacted<string>;
	/** Key type. */
	type: string;
	/** Whether the key is still valid. */
	valid: boolean;
	/** Whether the key has been revoked. */
	revoked: boolean;
}

export type SetupKey = Resource<"NetBird.SetupKey", SetupKeyProps, SetupKeyAttributes>;

/**
 * A NetBird setup key used to bootstrap peers onto the mesh.
 *
 * Immutable identity fields (`type`, `expiresIn`, `usageLimit`, `ephemeral`,
 * `allowExtraDnsLabels`) trigger replacement. `autoGroups` updates in place.
 *
 * @resource
 * @product Setup Keys
 * @category NetBird
 * @section Creating a Setup Key
 * @example One-off key with a one-hour lifetime
 * ```typescript
 * const key = yield* NetBird.SetupKey("LaptopBootstrap", {
 *   name: "laptop-bootstrap",
 *   type: "one-off",
 *   expiresIn: 3600,
 *   usageLimit: 1,
 * });
 * ```
 */
export const SetupKey = Resource<SetupKey>("NetBird.SetupKey");

export const isSetupKey = (value: unknown): value is SetupKey =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.SetupKey";

export const SetupKeyProvider = () =>
	Provider.succeed(SetupKey, {
		stables: ["keyId", "name"],
		diff: ({ news, olds }) =>
			Effect.sync(() => {
				if (!isResolved(news) || !olds) return undefined;
				const type = news.type ?? "reusable";
				const expiresIn = news.expiresIn ?? 86400;
				const usageLimit = news.usageLimit ?? 0;
				const ephemeral = news.ephemeral ?? false;
				const allowExtraDnsLabels = news.allowExtraDnsLabels ?? false;
				if (
					(olds.type ?? "reusable") !== type ||
					(olds.expiresIn ?? 86400) !== expiresIn ||
					(olds.usageLimit ?? 0) !== usageLimit ||
					(olds.ephemeral ?? false) !== ephemeral ||
					(olds.allowExtraDnsLabels ?? false) !== allowExtraDnsLabels
				) {
					return { action: "replace" } as const;
				}
			}),
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.keyId) {
				const direct = yield* catchNotFound(setupKeysKeyIdGet({ keyId: output.keyId }));
				if (direct) {
					return toAttributes(direct, output.key);
				}
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findSetupKeyByName(name);
			if (!existing) return undefined;
			return toAttributes(existing, output?.key);
		}),
		list: Effect.fn(function* () {
			const all = yield* setupKeysGet({});
			return all.map(k => toAttributes(k));
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as SetupKeyProps);
			const name = yield* resolveName(id, props.name);
			const type = props.type ?? "reusable";
			const expiresIn = props.expiresIn ?? 86400;
			const autoGroups = props.autoGroups ?? [];
			const usageLimit = props.usageLimit ?? 0;
			const ephemeral = props.ephemeral ?? false;
			const allowExtraDnsLabels = props.allowExtraDnsLabels ?? false;

			let observed:
				| {
						id: string;
						name: string;
						key: string;
						type: string;
						valid: boolean;
						revoked: boolean;
						auto_groups: ReadonlyArray<string>;
				  }
				| undefined;
			if (output?.keyId) {
				const direct = yield* catchNotFound(setupKeysKeyIdGet({ keyId: output.keyId }));
				if (direct) observed = direct;
			}
			if (!observed) {
				observed = yield* findSetupKeyByName(name);
			}

			if (!observed) {
				const created = yield* setupKeysPost({
					name,
					type,
					expires_in: expiresIn,
					auto_groups: autoGroups,
					usage_limit: usageLimit,
					ephemeral,
					allow_extra_dns_labels: allowExtraDnsLabels,
				}).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findSetupKeyByName(name);
							if (existing) return existing;
							return yield* Effect.fail(err);
						}),
					),
				);
				return toAttributes(created);
			}

			const groupsChanged =
				autoGroups.length !== observed.auto_groups.length || autoGroups.some(g => !observed.auto_groups.includes(g));
			if (groupsChanged || observed.revoked) {
				const updated = yield* setupKeysKeyIdPut({
					keyId: observed.id,
					revoked: false,
					auto_groups: autoGroups,
				});
				return toAttributes(updated, output?.key ?? Redacted.make(observed.key));
			}

			return toAttributes(observed, output?.key);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFound(setupKeysKeyIdDelete({ keyId: output.keyId }));
		}),
	});

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const findSetupKeyByName = (name: string) =>
	setupKeysGet({}).pipe(
		Effect.map(keys => keys.find(k => k.name === name && !k.revoked)),
		Effect.catch(() => Effect.succeed(undefined)),
	);

const toAttributes = (
	key: {
		id: string;
		name: string;
		key: string;
		type: string;
		valid: boolean;
		revoked: boolean;
	},
	previous?: Redacted.Redacted<string>,
): SetupKeyAttributes => ({
	keyId: key.id,
	name: key.name,
	// Prefer a previously captured secret when the API returns a masked value.
	key: previous ?? Redacted.make(key.key),
	type: key.type,
	valid: key.valid,
	revoked: key.revoked,
});
