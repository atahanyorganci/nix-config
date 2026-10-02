import { NodeRuntime } from "@effect/platform-node";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { matchesHost } from "@yorganci/netbird-alchemy";
import { CredentialsFromEnv } from "@yorganci/netbird-api/Credentials";
import { peersGet } from "@yorganci/netbird-api/peers";
import * as Argument from "effect/cli/Argument";
import * as Command from "effect/cli/Command";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";

/**
 * NetBird credentials (`NB_PAT`, `NB_MANAGEMENT_URL`) come from
 * the environment, which `doppler run` fills from Doppler.
 */
const netbirdApi = Layer.mergeAll(CredentialsFromEnv, FetchHttpClient.layer);

const hostsArg = Argument.String("host").pipe(
	Argument.withDescription("Host name to filter (NetBird peer dns_label, e.g. mars, venus)"),
	Argument.variadic({ min: 0 }),
);

const listPeers = Command.make("list-peers", {
	hosts: hostsArg,
}).pipe(
	Command.withDescription("List NetBird peers from the management API"),
	Command.withHandler(
		Effect.fn(function* ({ hosts }) {
			const peers = yield* peersGet({}).pipe(Effect.provide(netbirdApi));

			const filtered = hosts.length === 0 ? peers : peers.filter(peer => hosts.some(host => matchesHost(peer, host)));

			const sorted = [...filtered].sort((left, right) =>
				(left.name || left.dns_label).localeCompare(right.name || right.dns_label),
			);

			for (const peer of sorted) {
				yield* Console.log(
					`${peer.connected ? "connected" : "disconnected"}\t${peer.name || peer.dns_label}\t${peer.dns_label}\t${peer.ip}\t${peer.last_seen}`,
				);
			}
		}),
	),
);

const program = Command.run(listPeers, { version: "0.0.0" }).pipe(
	Effect.provide(NodeServices.layer),
	Effect.scoped,
	Effect.orDie,
);

NodeRuntime.runMain(program as Effect.Effect<void>);
