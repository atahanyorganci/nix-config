import { NodeRuntime } from "@effect/platform-node";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { CredentialsFromEnv } from "@yorganci/netbird-api/Credentials";
import { reverseProxiesClustersGet } from "@yorganci/netbird-api/services";
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

const addressesArg = Argument.String("address").pipe(
	Argument.withDescription("Cluster address to filter (e.g. yorganci.dev)"),
	Argument.variadic({ min: 0 }),
);

const listProxyClusters = Command.make("list-proxy-clusters", {
	addresses: addressesArg,
}).pipe(
	Command.withDescription("List NetBird reverse-proxy clusters from the management API"),
	Command.withHandler(
		Effect.fn(function* ({ addresses }) {
			const clusters = yield* reverseProxiesClustersGet({}).pipe(Effect.provide(netbirdApi));

			const filtered =
				addresses.length === 0
					? clusters
					: clusters.filter(cluster => addresses.some(address => cluster.address === address));

			const sorted = [...filtered].sort((left, right) => left.address.localeCompare(right.address));

			for (const cluster of sorted) {
				yield* Console.log(
					`${cluster.online ? "online" : "offline"}\t${cluster.address}\t${cluster.connected_proxies}\t${cluster.private ? "private" : "public"}`,
				);
			}
		}),
	),
);

const program = Command.run(listProxyClusters, { version: "0.0.0" }).pipe(
	Effect.provide(NodeServices.layer),
	Effect.scoped,
	Effect.orDie,
);

NodeRuntime.runMain(program as Effect.Effect<void>);
