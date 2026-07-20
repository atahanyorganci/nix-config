import { reverseProxiesClustersGet } from "@yorganci/netbird-api/reverseProxiesClustersGet";
import { reverseProxiesDomainsGet } from "@yorganci/netbird-api/reverseProxiesDomainsGet";
import * as Effect from "effect/Effect";
import { expect } from "vitest";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-ReverseProxyDomain");

const DOMAIN_NAME = "alchemy-test.example.com";

test.provider.skipIf(!isDockerReady)("create and delete a reverse-proxy domain when a cluster exists", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const clusters = yield* reverseProxiesClustersGet({});
		if (clusters.length === 0) {
			// Fresh management-only fixtures often have no proxy cluster.
			return;
		}

		const targetCluster = clusters[0]!.address;
		const domain = yield* stack.deploy(
			NetBird.ReverseProxyDomain("BasicDomain", {
				domain: DOMAIN_NAME,
				targetCluster,
			}),
		);

		expect(domain.domainId).toBeDefined();
		expect(domain.domain).toEqual(DOMAIN_NAME);

		const listed = yield* reverseProxiesDomainsGet({});
		expect(listed.some(d => d.id === domain.domainId)).toEqual(true);

		yield* stack.destroy();

		const afterDestroy = yield* reverseProxiesDomainsGet({});
		expect(afterDestroy.find(d => d.id === domain.domainId)).toBeUndefined();
	}).pipe(withLogLevel),
);
