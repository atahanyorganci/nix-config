import { routesGet } from "@yorganci/netbird-api/routesGet";
import { routesPost } from "@yorganci/netbird-api/routesPost";
import { routesRouteIdDelete } from "@yorganci/netbird-api/routesRouteIdDelete";
import { routesRouteIdGet } from "@yorganci/netbird-api/routesRouteIdGet";
import { routesRouteIdPut } from "@yorganci/netbird-api/routesRouteIdPut";
import { isResolved } from "alchemy/Diff";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound, catchNotFoundOrUnavailable } from "../errors.ts";

export interface RouteProps {
	/**
	 * Stable route identifier. Used to adopt an existing route by description
	 * during state recovery. If omitted, a unique description is generated
	 * from the stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	description?: string;
	networkId: string;
	enabled?: boolean;
	peer?: string;
	peerGroups?: ReadonlyArray<string>;
	network?: string;
	domains?: ReadonlyArray<string>;
	metric?: number;
	masquerade?: boolean;
	groups?: ReadonlyArray<string>;
	keepRoute?: boolean;
	accessControlGroups?: ReadonlyArray<string>;
	skipAutoApply?: boolean;
}

export interface RouteAttributes {
	routeId: string;
	description: string;
	networkId: string;
	enabled: boolean;
	network: string | undefined;
}

export type Route = Resource<"NetBird.Route", RouteProps, RouteAttributes>;

/**
 * A NetBird route — exit nodes and network prefixes distributed to peer groups.
 *
 * @resource
 * @product Routes
 * @category NetBird
 * @section Creating a Route
 * @example Mars exit node restricted to Admin
 * ```typescript
 * const exit = yield* NetBird.Route("MarsExit", {
 *   description: "mars-exit-node",
 *   networkId: network.networkId,
 *   network: "0.0.0.0/0",
 *   peer: mars.peerId,
 *   groups: [adminGroup.groupId],
 *   accessControlGroups: [adminGroup.groupId],
 *   masquerade: true,
 *   metric: 9999,
 *   keepRoute: false,
 * });
 * ```
 */
export const Route = Resource<Route>("NetBird.Route");

export const isRoute = (value: unknown): value is Route =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.Route";

type ApiRoute = {
	id: string;
	description: string;
	network_id: string;
	enabled: boolean;
	peer?: string;
	peer_groups?: ReadonlyArray<string>;
	network?: string;
	domains?: ReadonlyArray<string>;
	metric: number;
	masquerade: boolean;
	groups: ReadonlyArray<string>;
	keep_route: boolean;
	access_control_groups?: ReadonlyArray<string>;
	skip_auto_apply?: boolean;
};

export const RouteProvider = () =>
	Provider.succeed(Route, {
		stables: ["routeId", "description"],
		diff: ({ news, olds }) =>
			Effect.sync(() => {
				if (!isResolved(news) || !olds) return undefined;
				if (news.networkId !== olds.networkId) {
					return { action: "replace" } as const;
				}
			}),
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.routeId) {
				const direct = yield* catchNotFound(routesRouteIdGet({ routeId: output.routeId }));
				if (direct) return toAttributes(direct);
			}
			const description = yield* resolveDescription(id, olds?.description ?? output?.description);
			const networkId = output?.networkId ?? olds?.networkId;
			if (!networkId) return undefined;
			const existing = yield* findRouteByDescription(description, networkId);
			if (!existing) return undefined;
			return toAttributes(existing);
		}),
		list: Effect.fn(function* () {
			const all = yield* routesGet({});
			return all.map(toAttributes);
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as RouteProps);
			if (!props.networkId) {
				return yield* Effect.die(new Error('NetBird.Route requires "networkId"'));
			}

			const description = yield* resolveDescription(id, props.description);
			const enabled = props.enabled ?? true;
			const metric = props.metric ?? 9999;
			const masquerade = props.masquerade ?? true;
			const groups = props.groups ?? [];
			const keepRoute = props.keepRoute ?? false;

			let observed: ApiRoute | undefined;
			if (output?.routeId) {
				const direct = yield* catchNotFound(routesRouteIdGet({ routeId: output.routeId }));
				if (direct) observed = direct;
			}
			if (!observed) {
				observed = yield* findRouteByDescription(description, props.networkId);
			}

			const payload = {
				description,
				network_id: props.networkId,
				enabled,
				...(props.peer !== undefined ? { peer: props.peer } : {}),
				...(props.peerGroups !== undefined ? { peer_groups: [...props.peerGroups] } : {}),
				...(props.network !== undefined ? { network: props.network } : {}),
				...(props.domains !== undefined ? { domains: [...props.domains] } : {}),
				metric,
				masquerade,
				groups: [...groups],
				keep_route: keepRoute,
				...(props.accessControlGroups !== undefined ? { access_control_groups: [...props.accessControlGroups] } : {}),
				...(props.skipAutoApply !== undefined ? { skip_auto_apply: props.skipAutoApply } : {}),
			};

			if (!observed) {
				const created = yield* routesPost(payload).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findRouteByDescription(description, props.networkId);
							if (existing) return existing;
							return yield* Effect.fail(err);
						}),
					),
				);
				return toAttributes(created);
			}

			if (!routesEqual(payload, observed)) {
				const updated = yield* routesRouteIdPut({
					routeId: observed.id,
					...payload,
				});
				return toAttributes(updated);
			}

			return toAttributes(observed);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFoundOrUnavailable(routesRouteIdDelete({ routeId: output.routeId }));
		}),
	});

const resolveDescription = (id: string, description: string | undefined) =>
	Effect.gen(function* () {
		if (description) return description;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 128 });
	});

const findRouteByDescription = (description: string, networkId: string) =>
	routesGet({}).pipe(
		Effect.map(routes => routes.find(route => route.description === description && route.network_id === networkId)),
		Effect.catch(() => Effect.succeed(undefined)),
	);

const toAttributes = (route: ApiRoute): RouteAttributes => ({
	routeId: route.id,
	description: route.description,
	networkId: route.network_id,
	enabled: route.enabled,
	network: route.network,
});

const routesEqual = (
	desired: {
		description: string;
		network_id: string;
		enabled: boolean;
		peer?: string;
		peer_groups?: ReadonlyArray<string>;
		network?: string;
		domains?: ReadonlyArray<string>;
		metric: number;
		masquerade: boolean;
		groups: ReadonlyArray<string>;
		keep_route: boolean;
		access_control_groups?: ReadonlyArray<string>;
		skip_auto_apply?: boolean;
	},
	observed: ApiRoute,
) => normalizeRoute(desired) === normalizeRoute(observed);

const normalizeRoute = (route: {
	description: string;
	network_id: string;
	enabled: boolean;
	peer?: string;
	peer_groups?: ReadonlyArray<string>;
	network?: string;
	domains?: ReadonlyArray<string>;
	metric: number;
	masquerade: boolean;
	groups: ReadonlyArray<string>;
	keep_route: boolean;
	access_control_groups?: ReadonlyArray<string>;
	skip_auto_apply?: boolean;
}) =>
	JSON.stringify({
		description: route.description,
		network_id: route.network_id,
		enabled: route.enabled,
		peer: route.peer ?? null,
		peer_groups: route.peer_groups ?? null,
		network: route.network ?? null,
		domains: route.domains ?? null,
		metric: route.metric,
		masquerade: route.masquerade,
		groups: [...route.groups].sort(),
		keep_route: route.keep_route,
		access_control_groups: route.access_control_groups ? [...route.access_control_groups].sort() : null,
		skip_auto_apply: route.skip_auto_apply ?? null,
	});
