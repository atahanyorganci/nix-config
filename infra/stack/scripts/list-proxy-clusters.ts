import { BunRuntime } from "@effect/platform-bun";
import * as BunServices from "@effect/platform-bun/BunServices";
import { CredentialsFromConfig } from "@yorganci/netbird-api/Credentials";
import { reverseProxiesClustersGet } from "@yorganci/netbird-api/reverseProxiesClustersGet";
import { AlchemyContextLive } from "alchemy/AlchemyContext";
import { ArtifactStore, createArtifactStore } from "alchemy/Artifacts";
import { AuthProviders } from "alchemy/Auth/AuthProvider";
import { withProfileOverride } from "alchemy/Auth/Profile";
import { Stage } from "alchemy/Stage";
import * as State from "alchemy/State";
import { loadConfigProvider } from "alchemy/Util/ConfigProvider";
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
import { readNetbirdCredentials } from "../src/netbird-credentials.ts";
import netbirdServerStack from "../stack/netbird-server.ts";

const USER = Config.string("USER").pipe(
	Config.orElse(() => Config.string("USERNAME")),
	Config.withDefault("unknown"),
);

const defaultStage = USER.pipe(
	Effect.flatMap(user => Config.string("stage").pipe(Config.withDefault(`dev_${user}`))),
	Effect.orDie,
);

const stageFlag = Flag.string("stage").pipe(
	Flag.withDescription("Alchemy stage for the NetbirdServer stack (defaults to dev_${USER})"),
	Flag.optional,
	Flag.mapEffect(
		Effect.fn(function* (stage) {
			if (Option.isSome(stage)) {
				return stage.value;
			}
			return yield* defaultStage;
		}),
	),
);

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

const readNetbirdCredentialsFromState = (state: State.StateService, stage: string) =>
	readNetbirdCredentials(stage).pipe(Effect.provide(Layer.succeed(State.State, Effect.succeed(state))));

const withAlchemyState = <A, E>(
	options: {
		stage: string;
		profile: string;
		envFile: Option.Option<string>;
	},
	body: (state: State.StateService) => Effect.Effect<A, E>,
) =>
	Effect.gen(function* () {
		if (!Effect.isEffect(netbirdServerStack)) {
			return yield* Effect.die("stack/netbird-server.ts must default-export an Alchemy stack effect");
		}

		const services = Layer.mergeAll(
			AlchemyContextLive,
			Layer.succeed(ArtifactStore, createArtifactStore()),
			Layer.succeed(AuthProviders, {}),
			ConfigProvider.layer(withProfileOverride(yield* loadConfigProvider(options.envFile), options.profile)),
			Logger.layer([], { mergeWithExisting: true }),
			Layer.succeed(Stage, options.stage),
		);

		return yield* Effect.gen(function* () {
			const stack = yield* netbirdServerStack;
			return yield* Effect.gen(function* () {
				const state = yield* yield* State.State;
				return yield* body(state);
			}).pipe(Effect.provide(stack.services));
		}).pipe(Effect.provide(services), Effect.scoped);
	});

const addressesArg = Argument.string("address").pipe(
	Argument.withDescription("Cluster address to filter (e.g. yorganci.dev)"),
	Argument.variadic({ min: 0 }),
);

const listProxyClusters = Command.make("list-proxy-clusters", {
	addresses: addressesArg,
	stage: stageFlag,
	profile: profileFlag,
	envFile: envFileFlag,
}).pipe(
	Command.withDescription("List NetBird reverse-proxy clusters from the management API"),
	Command.withHandler(
		Effect.fn(function* ({ addresses, stage, profile, envFile }) {
			yield* withAlchemyState({ stage, profile, envFile }, state =>
				Effect.gen(function* () {
					const credentials = yield* readNetbirdCredentialsFromState(state, stage);
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
	Effect.provide(BunServices.layer),
	Effect.scoped,
	Effect.orDie,
);

BunRuntime.runMain(program as Effect.Effect<void>);
