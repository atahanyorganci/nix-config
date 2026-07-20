import { peersGet } from "@yorganci/netbird-api/peersGet";
import { peersPeerIdGet } from "@yorganci/netbird-api/peersPeerIdGet";
import { peersPeerIdPut } from "@yorganci/netbird-api/peersPeerIdPut";
import { isResolved } from "alchemy/Diff";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound } from "../errors.ts";

export interface PeerProps {
	/**
	 * Existing NetBird peer ID. Peers are enrolled via setup keys / client
	 * login — this resource adopts and optionally updates them; it does not
	 * create new peers.
	 */
	peerId: string;
	/**
	 * Display name. When set, converges via PUT.
	 */
	name?: string;
	/**
	 * Whether the peer's SSH server is enabled.
	 *
	 * @default unchanged (API value)
	 */
	sshEnabled?: boolean;
	/**
	 * Whether peer login expiration is enabled.
	 *
	 * @default unchanged (API value)
	 */
	loginExpirationEnabled?: boolean;
	/**
	 * Whether peer inactivity expiration is enabled.
	 *
	 * @default unchanged (API value)
	 */
	inactivityExpirationEnabled?: boolean;
}

export interface PeerAttributes {
	/** UUID of the peer assigned by NetBird. */
	peerId: string;
	/** Display name reported by NetBird. */
	name: string;
	/** Machine hostname reported by the agent. */
	hostname: string;
	/** DNS label used to form `{dnsLabel}.netbird.selfhosted`. */
	dnsLabel: string;
	/** Overlay IPv4 address. */
	ip: string;
	/** Whether the peer is currently connected to management. */
	connected: boolean;
	/** Whether SSH is enabled on the peer. */
	sshEnabled: boolean;
}

export type Peer = Resource<"NetBird.Peer", PeerProps, PeerAttributes>;

/**
 * An existing NetBird mesh peer — adopted by stable peer ID.
 *
 * Peers are not created by this resource (use a setup key / client login).
 * Mutable management fields (`name`, SSH / expiration flags) update in place.
 *
 * @resource
 * @product Peers
 * @category NetBird
 * @section Adopting a Peer
 * @example Reference a known peer by ID
 * ```typescript
 * const venus = yield* NetBird.Peer("Venus", {
 *   peerId: "d99ve6f0vp6kefutb2v0",
 * });
 * ```
 */
export const Peer = Resource<Peer>("NetBird.Peer");

export const isPeer = (value: unknown): value is Peer =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.Peer";

type ApiPeer = {
	id: string;
	name: string;
	hostname: string;
	dns_label: string;
	ip: string;
	connected: boolean;
	ssh_enabled: boolean;
	login_expiration_enabled: boolean;
	inactivity_expiration_enabled: boolean;
	approval_required: boolean;
	ipv6?: string;
};

export const PeerProvider = () =>
	Provider.succeed(Peer, {
		stables: ["peerId", "name"],
		diff: ({ news, olds }) =>
			Effect.sync(() => {
				if (!isResolved(news) || !olds) return undefined;
				if (news.peerId !== olds.peerId) {
					return { action: "replace" } as const;
				}
			}),
		read: Effect.fn(function* ({ output, olds }) {
			const peerId = output?.peerId ?? olds?.peerId;
			if (!peerId) return undefined;
			const direct = yield* catchNotFound(peersPeerIdGet({ peerId }));
			if (!direct) return undefined;
			return toAttributes(direct);
		}),
		list: Effect.fn(function* () {
			const all = yield* peersGet({});
			return all.map(toAttributes);
		}),
		reconcile: Effect.fn(function* ({ news, output }) {
			const props = news ?? ({} as PeerProps);
			const peerId = props.peerId;

			let observed: ApiPeer | undefined;
			if (output?.peerId) {
				const direct = yield* catchNotFound(peersPeerIdGet({ peerId: output.peerId }));
				if (direct) observed = direct;
			}
			if (!observed) {
				const direct = yield* catchNotFound(peersPeerIdGet({ peerId }));
				if (direct) observed = direct;
			}
			if (!observed) {
				return yield* Effect.die(
					new Error(`NetBird peer "${peerId}" not found — peers are enrolled via setup keys, not created by Alchemy`),
				);
			}

			const name = props.name ?? observed.name;
			const sshEnabled = props.sshEnabled ?? observed.ssh_enabled;
			const loginExpirationEnabled = props.loginExpirationEnabled ?? observed.login_expiration_enabled;
			const inactivityExpirationEnabled = props.inactivityExpirationEnabled ?? observed.inactivity_expiration_enabled;

			const needsUpdate =
				observed.name !== name ||
				observed.ssh_enabled !== sshEnabled ||
				observed.login_expiration_enabled !== loginExpirationEnabled ||
				observed.inactivity_expiration_enabled !== inactivityExpirationEnabled;

			if (needsUpdate) {
				const updated = yield* peersPeerIdPut({
					peerId: observed.id,
					name,
					ssh_enabled: sshEnabled,
					login_expiration_enabled: loginExpirationEnabled,
					inactivity_expiration_enabled: inactivityExpirationEnabled,
					approval_required: observed.approval_required,
				});
				return toAttributes(updated);
			}

			return toAttributes(observed);
		}),
		delete: Effect.fn(function* () {
			// Peers are enrolled outside Alchemy; never delete them on stack destroy.
		}),
	});

const toAttributes = (peer: ApiPeer): PeerAttributes => ({
	peerId: peer.id,
	name: peer.name,
	hostname: peer.hostname,
	dnsLabel: peer.dns_label,
	ip: peer.ip,
	connected: peer.connected,
	sshEnabled: peer.ssh_enabled,
});
