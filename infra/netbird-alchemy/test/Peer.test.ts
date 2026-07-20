import { peersGet } from "@yorganci/netbird-api/peersGet";
import { peersPeerIdGet } from "@yorganci/netbird-api/peersPeerIdGet";
import * as Effect from "effect/Effect";
import { expect } from "vitest";
import * as NetBird from "../src/index.ts";
import { createHarness } from "./harness.ts";
import { withLogLevel } from "./withLogLevel.ts";

const { test, fixture, isDockerReady } = createHarness("NetBirdFixture-Peer");

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
