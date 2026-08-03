import { networksNetworkIdRoutersGet } from "@yorganci/netbird-api/networksNetworkIdRoutersGet";
import { networksNetworkIdRoutersPost } from "@yorganci/netbird-api/networksNetworkIdRoutersPost";
import { networksNetworkIdRoutersRouterIdDelete } from "@yorganci/netbird-api/networksNetworkIdRoutersRouterIdDelete";
import { networksNetworkIdRoutersRouterIdGet } from "@yorganci/netbird-api/networksNetworkIdRoutersRouterIdGet";
import { networksNetworkIdRoutersRouterIdPut } from "@yorganci/netbird-api/networksNetworkIdRoutersRouterIdPut";
import { isResolved } from "alchemy/Diff";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound, catchNotFoundOrUnavailable } from "../errors.ts";

export interface NetworkRouterProps {
	networkId: string;
	peer?: string;
	peerGroups?: ReadonlyArray<string>;
	metric?: number;
	masquerade?: boolean;
	enabled?: boolean;
}

export interface NetworkRouterAttributes {
	routerId: string;
	networkId: string;
	peer: string | undefined;
	enabled: boolean;
	metric: number;
	masquerade: boolean;
}

export type NetworkRouter = Resource<"NetBird.NetworkRouter", NetworkRouterProps, NetworkRouterAttributes>;

/**
 * A NetBird network router — a peer that routes traffic for network resources.
 *
 * @resource
 * @product Network Routers
 * @category NetBird
 */
export const NetworkRouter = Resource<NetworkRouter>("NetBird.NetworkRouter");

export const isNetworkRouter = (value: unknown): value is NetworkRouter =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.NetworkRouter";

type ApiNetworkRouter = {
	id: string;
	peer?: string;
	peer_groups?: ReadonlyArray<string>;
	metric: number;
	masquerade: boolean;
	enabled: boolean;
};

export const NetworkRouterProvider = () =>
	Provider.succeed(NetworkRouter, {
		stables: ["routerId", "networkId"],
		diff: ({ news, olds }) =>
			Effect.sync(() => {
				if (!isResolved(news) || !olds) return undefined;
				if (news.networkId !== olds.networkId) {
					return { action: "replace" } as const;
				}
				if (news.peer !== undefined && olds.peer !== undefined && news.peer !== olds.peer) {
					return { action: "replace" } as const;
				}
			}),
		read: Effect.fn(function* ({ output, olds }) {
			const networkId = output?.networkId ?? olds?.networkId;
			if (!networkId) return undefined;

			if (output?.routerId) {
				const direct = yield* catchNotFound(
					networksNetworkIdRoutersRouterIdGet({
						networkId,
						routerId: output.routerId,
					}),
				);
				if (direct) return toAttributes(direct, networkId);
			}

			const peer = olds?.peer;
			if (!peer) return undefined;

			const existing = yield* findRouterByPeer(peer, networkId);
			if (!existing) return undefined;
			return toAttributes(existing, networkId);
		}),
		list: Effect.fn(function* () {
			return yield* Effect.succeed([] as Array<NetworkRouterAttributes>);
		}),
		reconcile: Effect.fn(function* ({ news, output }) {
			const props = news ?? ({} as NetworkRouterProps);
			if (!props.networkId) {
				return yield* Effect.die(new Error('NetBird.NetworkRouter requires "networkId"'));
			}
			if (!props.peer && (!props.peerGroups || props.peerGroups.length === 0)) {
				return yield* Effect.die(new Error('NetBird.NetworkRouter requires "peer" or non-empty "peerGroups"'));
			}

			const metric = props.metric ?? 9999;
			const masquerade = props.masquerade ?? true;
			const enabled = props.enabled ?? true;

			let observed: ApiNetworkRouter | undefined;
			if (output?.routerId) {
				const direct = yield* catchNotFound(
					networksNetworkIdRoutersRouterIdGet({
						networkId: props.networkId,
						routerId: output.routerId,
					}),
				);
				if (direct) observed = direct;
			}
			if (!observed && props.peer) {
				observed = yield* findRouterByPeer(props.peer, props.networkId);
			}

			const payload = {
				...(props.peer !== undefined ? { peer: props.peer } : {}),
				...(props.peerGroups !== undefined ? { peer_groups: [...props.peerGroups] } : {}),
				metric,
				masquerade,
				enabled,
			};

			if (!observed) {
				const created = yield* networksNetworkIdRoutersPost({
					networkId: props.networkId,
					...payload,
				}).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							if (props.peer) {
								const existing = yield* findRouterByPeer(props.peer, props.networkId);
								if (existing) return existing;
							}
							return yield* Effect.fail(err);
						}),
					),
				);
				return toAttributes(created, props.networkId);
			}

			if (!routersEqual(payload, observed)) {
				const updated = yield* networksNetworkIdRoutersRouterIdPut({
					networkId: props.networkId,
					routerId: observed.id,
					...payload,
				});
				return toAttributes(updated, props.networkId);
			}

			return toAttributes(observed, props.networkId);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFoundOrUnavailable(
				networksNetworkIdRoutersRouterIdDelete({
					networkId: output.networkId,
					routerId: output.routerId,
				}),
			);
		}),
	});

const findRouterByPeer = (peer: string, networkId: string) =>
	networksNetworkIdRoutersGet({ networkId }).pipe(
		Effect.map(routers => routers.find(router => router.peer === peer)),
		Effect.catch(() => Effect.succeed(undefined)),
	);

const toAttributes = (router: ApiNetworkRouter, networkId: string): NetworkRouterAttributes => ({
	routerId: router.id,
	networkId,
	peer: router.peer,
	enabled: router.enabled,
	metric: router.metric,
	masquerade: router.masquerade,
});

const routersEqual = (
	desired: {
		peer?: string;
		peer_groups?: ReadonlyArray<string>;
		metric: number;
		masquerade: boolean;
		enabled: boolean;
	},
	observed: ApiNetworkRouter,
) =>
	JSON.stringify({
		peer: desired.peer ?? null,
		peer_groups: desired.peer_groups ?? null,
		metric: desired.metric,
		masquerade: desired.masquerade,
		enabled: desired.enabled,
	}) ===
	JSON.stringify({
		peer: observed.peer ?? null,
		peer_groups: observed.peer_groups ?? null,
		metric: observed.metric,
		masquerade: observed.masquerade,
		enabled: observed.enabled,
	});
