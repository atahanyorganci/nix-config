import { NodeRuntime } from "@effect/platform-node";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { CredentialsFromEnv } from "@yorganci/netbird-api/Credentials";
import { reverseProxiesProxyTokensPost } from "@yorganci/netbird-api/self_hosted_proxies";
import * as Argument from "effect/cli/Argument";
import * as Command from "effect/cli/Command";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";

const PROXY_TOKEN_EXPIRES_IN_SECONDS = 365 * 86_400;

/**
 * NetBird credentials (`NB_PAT`, `NB_MANAGEMENT_URL`) come from
 * the environment, which `doppler run` fills from Doppler.
 */
const netbirdApi = Layer.mergeAll(CredentialsFromEnv, FetchHttpClient.layer);

const nameArg = Argument.String("name").pipe(
	Argument.withDescription("Proxy token name (e.g. mars-proxy)"),
	Argument.variadic({ min: 1 }),
);

const createProxyToken = Command.make("create-proxy-token", {
	names: nameArg,
}).pipe(
	Command.withDescription("Create NetBird reverse-proxy access tokens using NB_PAT"),
	Command.withHandler(
		Effect.fn(function* ({ names }) {
			for (const name of names) {
				const token = yield* reverseProxiesProxyTokensPost({
					name,
					expires_in: PROXY_TOKEN_EXPIRES_IN_SECONDS,
				}).pipe(Effect.provide(netbirdApi));

				yield* Console.log(`${name}\t${token.plain_token}`);
			}
		}),
	),
);

const program = Command.run(createProxyToken, { version: "0.0.0" }).pipe(
	Effect.provide(NodeServices.layer),
	Effect.scoped,
	Effect.orDie,
);

NodeRuntime.runMain(program as Effect.Effect<void>);
