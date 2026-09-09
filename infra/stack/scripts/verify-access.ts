import { BunRuntime } from "@effect/platform-bun";
import * as BunServices from "@effect/platform-bun/BunServices";
import { CredentialsFromConfig } from "@yorganci/netbird-api/Credentials";
import { groupsGet } from "@yorganci/netbird-api/groupsGet";
import { peersGet } from "@yorganci/netbird-api/peersGet";
import { policiesGet } from "@yorganci/netbird-api/policiesGet";
import { usersGet } from "@yorganci/netbird-api/usersGet";
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

const verifyAccess = Command.make("verify-access", {
	stage: stageFlag,
	profile: profileFlag,
	envFile: envFileFlag,
}).pipe(
	Command.withDescription(
		"Print NetBird users, groups, peers and policy rules to check zero-trust access before and after the Default policy cut-over",
	),
	Command.withHandler(
		Effect.fn(function* ({ stage, profile, envFile }) {
			yield* withAlchemyState({ stage, profile, envFile }, state =>
				Effect.gen(function* () {
					const credentials = yield* readNetbirdCredentialsFromState(state, stage);
					const netbirdApi = Layer.mergeAll(CredentialsFromConfig(credentials), FetchHttpClient.layer);
					const [users, groups, peers, policies] = yield* Effect.all([
						usersGet({}),
						groupsGet({}),
						peersGet({}),
						policiesGet({}),
					]).pipe(Effect.provide(netbirdApi));

					const peerById = new Map(peers.map(peer => [peer.id, peer]));
					for (const user of users) {
						yield* Console.log(
							`USER\t${user.email}\trole=${user.role}\tstatus=${user.status}\tauto_groups=${JSON.stringify(user.auto_groups)}`,
						);
					}
					for (const group of groups) {
						const names = (group.peers ?? []).map(entry => {
							const id = typeof entry === "string" ? entry : entry.id;
							const peer = peerById.get(id);
							return peer ? peer.name || peer.dns_label : id;
						});
						yield* Console.log(`GROUP\t${group.name}\tpeers=${names.length}\t[${names.join(", ")}]`);
					}
					for (const peer of peers) {
						yield* Console.log(
							`PEER\t${peer.name || peer.dns_label}\tssh=${peer.ssh_enabled}\tconnected=${peer.connected}\tip=${peer.ip}`,
						);
					}
					for (const policy of policies) {
						for (const rule of policy.rules ?? []) {
							yield* Console.log(
								`POLICY\t${policy.name}\tenabled=${policy.enabled}\tproto=${rule.protocol}\tsrc=${(rule.sources ?? []).map(s => s.name).join(",")}\tdst=${(rule.destinations ?? []).map(d => d.name).join(",")}\tports=${JSON.stringify(rule.ports ?? rule.port_ranges ?? null)}\tauthz=${JSON.stringify(rule.authorized_groups ?? null)}`,
							);
						}
					}
				}),
			);
		}),
	),
);

const program = Command.run(verifyAccess, { version: "0.0.0" }).pipe(
	Effect.provide(BunServices.layer),
	Effect.scoped,
	Effect.orDie,
);

BunRuntime.runMain(program as Effect.Effect<void>);
