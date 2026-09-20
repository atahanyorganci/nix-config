import { BunRuntime } from "@effect/platform-bun";
import * as BunServices from "@effect/platform-bun/BunServices";
import { CredentialsFromConfig } from "@yorganci/netbird-api/Credentials";
import { reverseProxiesProxyTokensPost } from "@yorganci/netbird-api/self_hosted_proxies";
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

const PROXY_TOKEN_EXPIRES_IN_SECONDS = 365 * 86_400;

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

const nameArg = Argument.string("name").pipe(
	Argument.withDescription("Proxy token name (e.g. mars-proxy)"),
	Argument.variadic({ min: 1 }),
);

const createProxyToken = Command.make("create-proxy-token", {
	names: nameArg,
	profile: profileFlag,
	envFile: envFileFlag,
}).pipe(
	Command.withDescription("Create NetBird reverse-proxy access tokens using NETBIRD_API_TOKEN"),
	Command.withHandler(
		Effect.fn(function* ({ names, profile, envFile }) {
			yield* withScriptConfig(
				{ profile, envFile },
				Effect.gen(function* () {
					const credentials = yield* netbirdCredentialsFromConfig;
					const netbirdApi = Layer.mergeAll(CredentialsFromConfig(credentials), FetchHttpClient.layer);

					for (const name of names) {
						const token = yield* reverseProxiesProxyTokensPost({
							name,
							expires_in: PROXY_TOKEN_EXPIRES_IN_SECONDS,
						}).pipe(Effect.provide(netbirdApi));

						yield* Console.log(`${name}\t${token.plain_token}`);
					}
				}),
			);
		}),
	),
);

const program = Command.run(createProxyToken, { version: "0.0.0" }).pipe(
	Effect.provide(BunServices.layer),
	Effect.scoped,
	Effect.orDie,
);

BunRuntime.runMain(program as Effect.Effect<void>);
