import { Credentials, DEFAULT_API_BASE_URL, type Config } from "@distilled.cloud/hetzner/Credentials";
import { ConfigError } from "@distilled.cloud/hetzner/Errors";
import * as EffectConfig from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

export { Credentials, DEFAULT_API_BASE_URL };
export type CredentialsConfig = Config;

/**
 * Resolve credentials from the process environment at API-call time.
 * `HETZNER_API_TOKEN` is this repo's name; `HCLOUD_TOKEN` is what the hcloud
 * CLI and Terraform provider read, so it is accepted as a fallback.
 */
export const CredentialsFromEnv: Layer.Layer<Credentials> = Layer.succeed(
	Credentials,
	EffectConfig.all({
		token: EffectConfig.redacted("HETZNER_API_TOKEN").pipe(
			EffectConfig.orElse(() => EffectConfig.redacted("HCLOUD_TOKEN")),
		),
		apiBaseUrl: EffectConfig.string("HETZNER_API_BASE_URL").pipe(
			EffectConfig.orElse(() => EffectConfig.string("HCLOUD_ENDPOINT")),
			EffectConfig.withDefault(DEFAULT_API_BASE_URL),
		),
	}).pipe(
		Effect.mapError(() => new ConfigError({ message: "HETZNER_API_TOKEN environment variable is required" })),
		Effect.orDie,
	),
);

/** Provide explicit Hetzner credentials. */
export const CredentialsFromConfig = (input: {
	apiToken: Redacted.Redacted<string> | string;
	apiBaseUrl?: string;
}): Layer.Layer<Credentials> =>
	Layer.succeed(
		Credentials,
		Effect.succeed({
			token: typeof input.apiToken === "string" ? Redacted.make(input.apiToken) : input.apiToken,
			apiBaseUrl: input.apiBaseUrl ?? DEFAULT_API_BASE_URL,
		}),
	);
