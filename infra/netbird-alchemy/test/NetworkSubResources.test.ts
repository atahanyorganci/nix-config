import { networksNetworkIdResourcesGet } from "@yorganci/netbird-api/networksNetworkIdResourcesGet";
import { networksNetworkIdRoutersGet } from "@yorganci/netbird-api/networksNetworkIdRoutersGet";
import { peersGet } from "@yorganci/netbird-api/peersGet";
import { routesRouteIdGet } from "@yorganci/netbird-api/routesRouteIdGet";
import * as Effect from "effect/Effect";
import { expect } from "vitest";
import { catchNotFound } from "../src/errors.ts";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-NetworkSubResources");

const ROUTE_DESC = "alchemy-test-route";
const NETWORK_NAME = "alchemy-test-network-subresources";
const RESOURCE_NAME = "alchemy-test-resource";

test.provider.skipIf(!isDockerReady)("create, update, and delete a route", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const { route } = yield* stack.deploy(
			Effect.gen(function* () {
				const group = yield* NetBird.Group("RouteGroup", { name: `${ROUTE_DESC}-group` });
				const peers = yield* peersGet({});
				if (peers.length === 0) {
					return { route: undefined };
				}

				const route = yield* NetBird.Route("TestRoute", {
					description: ROUTE_DESC,
					networkId: "alchemy-test-routes",
					network: "10.64.0.0/24",
					peer: peers[0]!.id,
					groups: [group.groupId],
					accessControlGroups: [group.groupId],
					metric: 9999,
					masquerade: true,
					keepRoute: false,
				});
				return { route };
			}),
		);

		if (!route) return;

		expect(route.routeId).toBeDefined();
		expect(route.description).toEqual(ROUTE_DESC);

		const live = yield* routesRouteIdGet({ routeId: route.routeId });
		expect(live.network).toEqual("10.64.0.0/24");

		const { route: updated } = yield* stack.deploy(
			Effect.gen(function* () {
				const group = yield* NetBird.Group("RouteGroup", { name: `${ROUTE_DESC}-group` });
				const peers = yield* peersGet({});
				if (peers.length === 0) {
					return { route: undefined };
				}

				const route = yield* NetBird.Route("TestRoute", {
					description: ROUTE_DESC,
					networkId: "alchemy-test-routes",
					network: "10.64.1.0/24",
					peer: peers[0]!.id,
					groups: [group.groupId],
					accessControlGroups: [group.groupId],
					metric: 9999,
					masquerade: true,
					keepRoute: false,
				});
				return { route };
			}),
		);
		expect(updated?.routeId).toEqual(route.routeId);

		const afterUpdate = yield* routesRouteIdGet({ routeId: route.routeId });
		expect(afterUpdate.network).toEqual("10.64.1.0/24");

		yield* stack.destroy();

		const afterDestroy = yield* catchNotFound(routesRouteIdGet({ routeId: route.routeId }));
		expect(afterDestroy).toBeUndefined();
	}).pipe(withLogLevel),
);

test.provider.skipIf(!isDockerReady)("create, update, and delete network resources and routers", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const { resource, router, network } = yield* stack.deploy(
			Effect.gen(function* () {
				const group = yield* NetBird.Group("NetworkSubGroup", { name: `${NETWORK_NAME}-group` });
				const network = yield* NetBird.Network("SubNetwork", {
					name: NETWORK_NAME,
					description: "alchemy network subresources",
				});

				const resource = yield* NetBird.NetworkResource("SubResource", {
					networkId: network.networkId,
					name: RESOURCE_NAME,
					address: "192.168.1.0/24",
					enabled: true,
					groups: [group.groupId],
				});

				const peers = yield* peersGet({});
				if (peers.length === 0) {
					return { resource, router: undefined, network };
				}

				const router = yield* NetBird.NetworkRouter("SubRouter", {
					networkId: network.networkId,
					peer: peers[0]!.id,
					metric: 9999,
					masquerade: true,
					enabled: true,
				});
				return { resource, router, network };
			}),
		);

		expect(resource.resourceId).toBeDefined();

		const resources = yield* networksNetworkIdResourcesGet({ networkId: network.networkId });
		expect(resources.some(entry => entry.id === resource.resourceId)).toBe(true);

		if (router) {
			expect(router.routerId).toBeDefined();
			const routers = yield* networksNetworkIdRoutersGet({ networkId: network.networkId });
			expect(routers.some(entry => entry.id === router.routerId)).toBe(true);
		}

		yield* stack.destroy();
	}).pipe(withLogLevel),
);
