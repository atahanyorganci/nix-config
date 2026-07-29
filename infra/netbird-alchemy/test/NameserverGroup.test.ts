import { dnsNameserversNsgroupIdGet } from "@yorganci/netbird-api/dnsNameserversNsgroupIdGet";
import { groupsGet } from "@yorganci/netbird-api/groupsGet";
import * as Effect from "effect/Effect";
import { expect } from "vitest";
import { catchNotFound } from "../src/errors.ts";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-NameserverGroup");

const NAME_BASIC = "alchemy-test-nsg-basic";

test.provider.skipIf(!isDockerReady)("create, update IP, and delete a nameserver group", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const groups = yield* groupsGet({});
		const allGroup = groups.find(g => g.name === "All");
		expect(allGroup).toBeDefined();

		const created = yield* stack.deploy(
			NetBird.NameserverGroup("BasicNsGroup", {
				name: NAME_BASIC,
				description: "alchemy test nameserver group",
				nameservers: [{ ip: "10.0.0.1", ns_type: "udp", port: 53 }],
				enabled: true,
				groups: [allGroup!.id],
				primary: true,
				domains: [],
				search_domains_enabled: false,
			}),
		);

		expect(created.nsgroupId).toBeDefined();
		expect(created.name).toEqual(NAME_BASIC);
		expect(created.nameservers[0]?.ip).toEqual("10.0.0.1");
		expect(created.primary).toEqual(true);

		const live = yield* dnsNameserversNsgroupIdGet({ nsgroupId: created.nsgroupId });
		expect(live.id).toEqual(created.nsgroupId);
		expect(live.name).toEqual(NAME_BASIC);
		expect(live.nameservers[0]?.ip).toEqual("10.0.0.1");

		const updated = yield* stack.deploy(
			NetBird.NameserverGroup("BasicNsGroup", {
				name: NAME_BASIC,
				description: "alchemy test nameserver group",
				nameservers: [{ ip: "10.0.0.2", ns_type: "udp", port: 53 }],
				enabled: true,
				groups: [allGroup!.id],
				primary: true,
				domains: [],
				search_domains_enabled: false,
			}),
		);
		expect(updated.nsgroupId).toEqual(created.nsgroupId);
		expect(updated.nameservers[0]?.ip).toEqual("10.0.0.2");

		const afterUpdate = yield* dnsNameserversNsgroupIdGet({ nsgroupId: created.nsgroupId });
		expect(afterUpdate.nameservers[0]?.ip).toEqual("10.0.0.2");

		yield* stack.destroy();

		const afterDestroy = yield* catchNotFound(dnsNameserversNsgroupIdGet({ nsgroupId: created.nsgroupId }));
		expect(afterDestroy).toBeUndefined();
	}).pipe(withLogLevel),
);
