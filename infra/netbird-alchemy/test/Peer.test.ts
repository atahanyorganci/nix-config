import { peersGet } from "@yorganci/netbird-api/peersGet";
import { peersPeerIdGet } from "@yorganci/netbird-api/peersPeerIdGet";
import * as Effect from "effect/Effect";
import { expect, test as vitest } from "vitest";
import * as NetBird from "../src/index.ts";
import { findPeerByHost, matchesHost } from "../src/Peer/Peer.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-Peer");

vitest("matchesHost compares name, hostname, and dns_label", () => {
	const peer = { name: "Venus", dns_label: "venus.netbird.selfhosted", hostname: "venus.local" };
	expect(matchesHost(peer, "Venus")).toBe(true);
	expect(matchesHost(peer, "venus.local")).toBe(true);
	expect(matchesHost(peer, "venus.netbird.selfhosted")).toBe(true);
	expect(matchesHost(peer, "venus")).toBe(true);
	expect(matchesHost(peer, "mars")).toBe(false);
});

test.provider.skipIf(!isDockerReady)("adopt an existing peer by ID", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const peers = yield* peersGet({});
		if (peers.length === 0) {
			// Fresh management fixture may have no enrolled peers yet.
			return;
		}

		const existing = peers[0]!;
		const peer = yield* stack.deploy(
			NetBird.Peer("AdoptedPeer", {
				peerId: existing.id,
				name: existing.name,
			}),
		);

		expect(peer.peerId).toEqual(existing.id);
		expect(peer.name).toEqual(existing.name);

		const live = yield* peersPeerIdGet({ peerId: peer.peerId });
		expect(live.id).toEqual(peer.peerId);

		// Destroy must not delete the underlying peer (enrolled outside Alchemy).
		yield* stack.destroy();
		const afterDestroy = yield* peersPeerIdGet({ peerId: existing.id });
		expect(afterDestroy.id).toEqual(existing.id);
	}).pipe(withLogLevel),
);

test.provider.skipIf(!isDockerReady)("adopt an existing peer by host", stack =>
	Effect.gen(function* () {
		yield* fixture;
		yield* stack.destroy();

		const peers = yield* peersGet({});
		if (peers.length === 0) {
			return;
		}

		const existing = peers[0]!;
		const host = existing.name || existing.hostname || existing.dns_label;
		const peer = yield* stack.deploy(
			NetBird.Peer("AdoptedByHost", {
				host,
			}),
		);

		expect(peer.peerId).toEqual(existing.id);
		expect(peer.name).toEqual(existing.name);

		yield* stack.destroy();
		const afterDestroy = yield* peersPeerIdGet({ peerId: existing.id });
		expect(afterDestroy.id).toEqual(existing.id);
	}).pipe(withLogLevel),
);

test.provider.skipIf(!isDockerReady)("findPeerByHost dies when host is missing", _stack =>
	Effect.gen(function* () {
		yield* fixture;

		const result = yield* Effect.exit(findPeerByHost("__no-such-peer-host__"));
		expect(result._tag).toEqual("Failure");
	}).pipe(withLogLevel),
);
