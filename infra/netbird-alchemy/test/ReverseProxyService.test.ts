import { reverseProxiesDomainsGet } from "@yorganci/netbird-api/reverseProxiesDomainsGet";
import { reverseProxiesServicesServiceIdGet } from "@yorganci/netbird-api/reverseProxiesServicesServiceIdGet";
import * as Effect from "effect/Effect";
import { expect } from "vitest";
import { catchNotFound } from "../src/errors.ts";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-ReverseProxyService");

const NAME_BASIC = "alchemy-test-rpservice-basic";

test.provider.skipIf(!isDockerReady)("create, update, and delete a reverse-proxy service when a domain exists", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const domains = yield* reverseProxiesDomainsGet({});
		if (domains.length === 0) {
			// Management-only fixtures often ship without proxy domains.
			return;
		}

		const domain = domains[0]!.domain;

		const service = yield* stack.deploy(
			NetBird.ReverseProxyService("BasicService", {
				name: NAME_BASIC,
				domain,
				enabled: true,
			}),
		);

		expect(service.serviceId).toBeDefined();
		expect(service.name).toEqual(NAME_BASIC);
		expect(service.domain).toEqual(domain);
		expect(service.enabled).toEqual(true);

		const live = yield* reverseProxiesServicesServiceIdGet({
			serviceId: service.serviceId,
		});
		expect(live.id).toEqual(service.serviceId);
		expect(live.name).toEqual(NAME_BASIC);

		const updated = yield* stack.deploy(
			NetBird.ReverseProxyService("BasicService", {
				name: NAME_BASIC,
				domain,
				enabled: false,
			}),
		);
		expect(updated.serviceId).toEqual(service.serviceId);
		expect(updated.enabled).toEqual(false);

		const afterUpdate = yield* reverseProxiesServicesServiceIdGet({
			serviceId: service.serviceId,
		});
		expect(afterUpdate.enabled).toEqual(false);

		yield* stack.destroy();

		const afterDestroy = yield* catchNotFound(reverseProxiesServicesServiceIdGet({ serviceId: service.serviceId }));
		expect(afterDestroy).toBeUndefined();
	}).pipe(withLogLevel),
);
