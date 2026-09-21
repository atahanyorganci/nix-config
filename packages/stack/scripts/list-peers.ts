import { NodeRuntime } from "@effect/platform-node";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { matchesHost } from "@yorganci/netbird-alchemy";
import { CredentialsFromConfig } from "@yorganci/netbird-api/Credentials";
import { peersGet } from "@yorganci/netbird-api/peers";
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

const hostsArg = Argument.string("host").pipe(
	Argument.withDescription("Host name to filter (NetBird peer dns_label, e.g. mars, venus)"),
	Argument.variadic({ min: 0 }),
);

const listPeers = Command.make("list-peers", {
	hosts: hostsArg,
	profile: profileFlag,
	envFile: envFileFlag,
}).pipe(
	Command.withDescription("List NetBird peers from the management API"),
	Command.withHandler(
		Effect.fn(function* ({ hosts, profile, envFile }) {
			yield* withScriptConfig(
				{ profile, envFile },
				Effect.gen(function* () {
					const credentials = yield* netbirdCredentialsFromConfig;
					const netbirdApi = Layer.mergeAll(CredentialsFromConfig(credentials), FetchHttpClient.layer);
					const peers = yield* peersGet({}).pipe(Effect.provide(netbirdApi));

					const filtered =
						hosts.length === 0 ? peers : peers.filter(peer => hosts.some(host => matchesHost(peer, host)));

					const sorted = [...filtered].sort((left, right) =>
						(left.name || left.dns_label).localeCompare(right.name || right.dns_label),
					);

					for (const peer of sorted) {
						yield* Console.log(
							`${peer.connected ? "connected" : "disconnected"}\t${peer.name || peer.dns_label}\t${peer.dns_label}\t${peer.ip}\t${peer.last_seen}`,
						);
					}
				}),
			);
		}),
	),
);

const program = Command.run(listPeers, { version: "0.0.0" }).pipe(
	Effect.provide(NodeServices.layer),
	Effect.scoped,
	Effect.orDie,
);

NodeRuntime.runMain(program as Effect.Effect<void>);
