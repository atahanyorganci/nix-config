import { ConfigError } from "@distilled.cloud/core/errors";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

export const DEFAULT_API_BASE_URL = "https://api.netbird.io";

export interface Config {
	readonly apiToken: Redacted.Redacted<string>;
	readonly apiBaseUrl: string;
}

export class Credentials extends Context.Service<Credentials, Effect.Effect<Config>>()("NetbirdCredentials") {}

const readEnv = (key: string): string | undefined =>
	(globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[key];

export const CredentialsFromEnv = Layer.succeed(
	Credentials,
	Effect.gen(function* () {
		const apiToken = readEnv("NETBIRD_API_TOKEN");
		if (!apiToken) {
			return yield* new ConfigError({
				message: "NETBIRD_API_TOKEN environment variable is required",
			});
		}

		return {
			apiToken: Redacted.make(apiToken),
			apiBaseUrl: readEnv("NETBIRD_API_BASE_URL") ?? DEFAULT_API_BASE_URL,
		};
	}).pipe(Effect.orDie),
);
