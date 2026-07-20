import { sshKeysGet } from "@yorganci/hetzner-api/sshKeysGet";
import { sshKeysIdDelete } from "@yorganci/hetzner-api/sshKeysIdDelete";
import { sshKeysIdGet } from "@yorganci/hetzner-api/sshKeysIdGet";
import { sshKeysIdPut } from "@yorganci/hetzner-api/sshKeysIdPut";
import { sshKeysPost } from "@yorganci/hetzner-api/sshKeysPost";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound } from "../errors.ts";

export interface SshKeyProps {
	/**
	 * Display name for the SSH key. Used as a stable identifier for adoption.
	 * If omitted, a unique name is generated from the stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	/** Public key material (e.g. `ssh-ed25519 AAAA...`). Changing this replaces the key. */
	publicKey: string;
	/**
	 * User-defined labels.
	 *
	 * @default {}
	 */
	labels?: Record<string, string>;
}

export interface SshKeyAttributes {
	/** Numeric ID assigned by Hetzner. */
	sshKeyId: number;
	/** Display name reported by Hetzner. */
	name: string;
	/** Public key material. */
	publicKey: string;
	/** Fingerprint of the public key. */
	fingerprint: string;
	/** User-defined labels. */
	labels: Record<string, string>;
}

export type SshKey = Resource<"Hetzner.SshKey", SshKeyProps, SshKeyAttributes>;

/**
 * A Hetzner Cloud SSH public key that can be injected into Servers at create time.
 *
 * @resource
 * @product SSH Keys
 * @category Hetzner
 */
export const SshKey = Resource<SshKey>("Hetzner.SshKey");

export const isSshKey = (value: unknown): value is SshKey =>
	Predicate.hasProperty(value, "Type") && value.Type === "Hetzner.SshKey";

export const SshKeyProvider = () =>
	Provider.succeed(SshKey, {
		stables: ["sshKeyId", "name"],
		diff: ({ news, olds }) =>
			Effect.sync(() => {
				if (!isResolved(news) || !olds) return undefined;
				if (news.publicKey !== olds.publicKey) {
					return { action: "replace" } as const;
				}
			}),
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.sshKeyId != null) {
				const direct = yield* catchNotFound(sshKeysIdGet({ id: output.sshKeyId }));
				if (direct) return toAttributes(direct.ssh_key);
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findSshKeyByName(name);
			if (!existing) return undefined;
			return toAttributes(existing);
		}),
		list: Effect.fn(function* () {
			const all = yield* sshKeysGet({});
			return all.ssh_keys.map(toAttributes);
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as SshKeyProps);
			const name = yield* resolveName(id, props.name);
			const labels = props.labels ?? {};
			const publicKey = props.publicKey;

			let observed: SshKeyApi | undefined;
			if (output?.sshKeyId != null) {
				const direct = yield* catchNotFound(sshKeysIdGet({ id: output.sshKeyId }));
				if (direct) observed = direct.ssh_key;
			}
			if (!observed) {
				observed = yield* findSshKeyByName(name);
			}

			if (!observed) {
				const created = yield* sshKeysPost({
					name,
					public_key: publicKey,
					labels,
				}).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findSshKeyByName(name);
							if (existing) return { ssh_key: existing };
							return yield* Effect.fail(err);
						}),
					),
				);
				return toAttributes(created.ssh_key);
			}

			if (observed.name !== name || !labelsEqual(observed.labels, labels)) {
				const updated = yield* sshKeysIdPut({
					id: observed.id,
					name,
					labels,
				});
				return toAttributes(updated.ssh_key);
			}

			return toAttributes(observed);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFound(sshKeysIdDelete({ id: output.sshKeyId }));
		}),
	});

type SshKeyApi = {
	id: number;
	name: string;
	fingerprint: string;
	public_key: string;
	labels: Record<string, string>;
};

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const findSshKeyByName = (name: string) =>
	sshKeysGet({ name }).pipe(
		Effect.map(res => res.ssh_keys.find(k => k.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);

const toAttributes = (key: SshKeyApi): SshKeyAttributes => ({
	sshKeyId: key.id,
	name: key.name,
	publicKey: key.public_key,
	fingerprint: key.fingerprint,
	labels: key.labels,
});

const labelsEqual = (a: Record<string, string>, b: Record<string, string>) => {
	const aKeys = Object.keys(a).sort();
	const bKeys = Object.keys(b).sort();
	if (aKeys.length !== bKeys.length) return false;
	return aKeys.every((k, i) => k === bKeys[i] && a[k] === b[k]);
};
