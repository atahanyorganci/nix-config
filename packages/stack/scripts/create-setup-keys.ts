import { NodeRuntime } from "@effect/platform-node";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { CredentialsFromConfig } from "@yorganci/netbird-api/Credentials";
import { setupKeysPost } from "@yorganci/netbird-api/setup_keys";
import { AlchemyContextLive } from "alchemy/AlchemyContext";
import { ArtifactStore, createArtifactStore } from "alchemy/Artifacts";
import { AuthProviders } from "alchemy/Auth/AuthProvider";
import { ProfileLive, withProfileOverride } from "alchemy/Auth/Profile";
import { Stage } from "alchemy/Stage";
import * as State from "alchemy/State";
import { loadConfigProvider } from "alchemy/Util/ConfigProvider";
import { PlatformServices } from "alchemy/Util/PlatformServices";
import * as Config from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as Argument from "effect/unstable/cli/Argument";
import * as Command from "effect/unstable/cli/Command";
import * as Flag from "effect/unstable/cli/Flag";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { readHomeInfraGroupId } from "../src/home-infra-state.ts";
import * as Inventory from "../src/inventory.ts";
import { netbirdCredentialsFromConfig } from "../src/netbird-credentials.ts";
import netbirdServerStack from "../stack/netbird-server.ts";

const SETUP_KEY_EXPIRES_IN_SECONDS = 86_400;

// The repository root, three levels up from `packages/stack/scripts`. Resolved
// through `Path` so the script does not depend on the working directory.
const repoRoot = Effect.gen(function* () {
	const path = yield* Path.Path;
	return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");
});

const evalInventory = Effect.gen(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	const cwd = yield* repoRoot;
	const stdout = yield* spawner.string(ChildProcess.make("nix", ["eval", "--json", ".#inventory"], { cwd }));
	return JSON.parse(stdout) as unknown;
}).pipe(Effect.flatMap(value => Schema.decodeUnknownEffect(Inventory.Inventory)(value)));

const groupIdFromState = (state: State.StateService, stage: string, groupName: Inventory.NetBirdGroupName) =>
	readHomeInfraGroupId(stage, groupName).pipe(Effect.provide(Layer.succeed(State.State, Effect.succeed(state))));

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

// Unlike the other scripts, this one still needs Alchemy state: it resolves
// HomeInfra group ids to populate each setup key's auto_groups.
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
			Layer.provideMerge(AlchemyContextLive, PlatformServices),
			Layer.provide(ProfileLive, PlatformServices),
			Layer.succeed(ArtifactStore, createArtifactStore()),
			Layer.succeed(AuthProviders, {}),
			ConfigProvider.layer(withProfileOverride(yield* loadConfigProvider(options.envFile), options.profile)),
			Logger.layer([], { mergeWithExisting: true }),
			Layer.succeed(Stage, options.stage),
			// Alchemy's stack and state layers take the HTTP client from the environment.
			FetchHttpClient.layer,
		);

		return yield* Effect.gen(function* () {
			const stack = yield* netbirdServerStack;
			return yield* Effect.gen(function* () {
				const state = yield* yield* State.State;
				return yield* body(state);
			}).pipe(Effect.provide(stack.services));
		}).pipe(Effect.provide(services), Effect.scoped);
	});

const hostsArg = Argument.string("host").pipe(
	Argument.withDescription("Host name (NetBird peer dns_label, e.g. mars, venus)"),
	Argument.variadic({ min: 1 }),
);

const createSetupKeys = Command.make("create-setup-keys", {
	hosts: hostsArg,
	stage: stageFlag,
	profile: profileFlag,
	envFile: envFileFlag,
}).pipe(
	Command.withDescription(
		"Create one-off NetBird setup keys that assign each host to its inventory peer group (Servers or Agents)",
	),
	Command.withHandler(
		Effect.fn(function* ({ hosts, stage, profile, envFile }) {
			const inventory = yield* evalInventory;
			yield* withAlchemyState({ stage, profile, envFile }, state =>
				Effect.gen(function* () {
					const credentials = yield* netbirdCredentialsFromConfig;
					const netbirdApi = Layer.mergeAll(CredentialsFromConfig(credentials), FetchHttpClient.layer);

					for (const host of hosts) {
						const groupName = Inventory.peerGroupForHost(inventory, host);
						if (!groupName) {
							const known = inventory.managedTargets[host] ?? inventory.agentHolders[host];
							if (!known) {
								return yield* Effect.die(`host "${host}" is not in flake inventory`);
							}
							return yield* Effect.die(
								`host "${host}" has no peer group — Admin/Users devices enroll via NetBird login, not setup keys`,
							);
						}

						const groupId = yield* groupIdFromState(state, stage, groupName);
						const setupKey = yield* setupKeysPost({
							name: host,
							type: "one-off",
							expires_in: SETUP_KEY_EXPIRES_IN_SECONDS,
							auto_groups: [groupId],
							usage_limit: 1,
							ephemeral: false,
							allow_extra_dns_labels: false,
						}).pipe(Effect.provide(netbirdApi));

						yield* Console.log(`${host}\t${setupKey.key}`);
					}
				}),
			);
		}),
	),
);

const program = Command.run(createSetupKeys, { version: "0.0.0" }).pipe(
	Effect.provide(NodeServices.layer),
	Effect.scoped,
	Effect.orDie,
);

NodeRuntime.runMain(program as Effect.Effect<void>);
