import { NodeRuntime } from "@effect/platform-node";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { CredentialsFromConfig } from "@yorganci/netbird-api/Credentials";
import { reverseProxiesClustersGet } from "@yorganci/netbird-api/services";
import { ProfileLive, withProfileOverride } from "alchemy/Auth/Profile";
import { loadConfigProvider } from "alchemy/Util/ConfigProvider";
import { PlatformServices } from "alchemy/Util/PlatformServices";
import * as Config from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as Option from "effect/Option";
import * as Argument from "effect/unstable/cli/Argument";
import * as Command from "effect/unstable/cli/Command";
import * as Flag from "effect/unstable/cli/Flag";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import { netbirdCredentialsFromConfig } from "../src/netbird-credentials.ts";

const profileFlag = Flag.string("profile").pipe(
	Flag.withDescription("Alchemy auth profile (defaults to $ALCHEMY_PROFILE or 'default')"),
	Flag.optional,
	Flag.mapEffect(
		Effect.fn(function* (profile) {
			if (Option.isSome(profile)) {
				return profile.value;
			}
			return yield* Config.string("ALCHEMY_PROFILE").pipe(Config.withDefault("default"), Effect.orDie);
		}),
	),
);

const envFileFlag = Flag.file("env-file").pipe(
	Flag.optional,
	Flag.withDescription("Environment file to load (defaults to .env when present)"),
);

/**
 * Credentials now come from configuration rather than NetbirdServer stack
 * state, so this only needs the ambient ConfigProvider (which is what makes
 * `--env-file` and the profile override work).
 */
const withScriptConfig = <A, E>(
	options: {
		profile: string;
		envFile: Option.Option<string>;
	},
	body: Effect.Effect<A, E>,
) =>
	Effect.gen(function* () {
		const configProvider = withProfileOverride(yield* loadConfigProvider(options.envFile), options.profile);
		return yield* body.pipe(
			Effect.provide(
				Layer.mergeAll(
					ConfigProvider.layer(configProvider),
					Layer.provide(ProfileLive, PlatformServices),
					Logger.layer([], { mergeWithExisting: true }),
					FetchHttpClient.layer,
				),
			),
		);
	}).pipe(Effect.provide(PlatformServices), Effect.scoped);

const addressesArg = Argument.string("address").pipe(
	Argument.withDescription("Cluster address to filter (e.g. yorganci.dev)"),
	Argument.variadic({ min: 0 }),
);

const listProxyClusters = Command.make("list-proxy-clusters", {
	addresses: addressesArg,
	profile: profileFlag,
	envFile: envFileFlag,
}).pipe(
	Command.withDescription("List NetBird reverse-proxy clusters from the management API"),
	Command.withHandler(
		Effect.fn(function* ({ addresses, profile, envFile }) {
			yield* withScriptConfig(
				{ profile, envFile },
				Effect.gen(function* () {
					const credentials = yield* netbirdCredentialsFromConfig;
					const netbirdApi = Layer.mergeAll(CredentialsFromConfig(credentials), FetchHttpClient.layer);
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
			);
		}),
	),
);

const program = Command.run(listProxyClusters, { version: "0.0.0" }).pipe(
	Effect.provide(NodeServices.layer),
	Effect.scoped,
	Effect.orDie,
);

NodeRuntime.runMain(program as Effect.Effect<void>);
