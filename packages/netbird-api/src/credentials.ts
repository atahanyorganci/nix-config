/**
 * NetBird credentials — hand-written.
 *
 * The `Credentials` service holds an *effect* that resolves the current
 * credentials on every request (the protocol layer resolves it per request
 * on the calling fiber). `CredentialsFromEnv` reads `NB_PAT` and
 * `NB_MANAGEMENT_URL`.
 */
import { ConfigError } from "@distilled.cloud/core/errors";
import * as EffectConfig from "effect/Config";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

/**
 * NetBird Cloud's management API. Routes carry the `/api` prefix, so this is
 * the bare origin; self-hosted accounts point it at their management server.
 */
export const DEFAULT_API_BASE_URL = "https://api.netbird.io";

export interface Config {
	readonly apiToken: Redacted.Redacted<string>;
	readonly managementUrl: string;
}

export class Credentials extends Context.Service<Credentials, Effect.Effect<Config>>()("NetbirdCredentials") {}

const envConfig = EffectConfig.all({
	// `NB_PAT` / `NB_MANAGEMENT_URL` are what NetBird's Terraform provider reads.
	apiToken: EffectConfig.String("NB_PAT"),
	managementUrl: EffectConfig.String("NB_MANAGEMENT_URL").pipe(EffectConfig.withDefault(DEFAULT_API_BASE_URL)),
});

export const CredentialsFromEnv = Layer.succeed(
	Credentials,
	envConfig.pipe(
		Effect.mapError(
			() =>
				new ConfigError({
					message: "NB_PAT environment variable is required",
				}),
		),
		Effect.map(({ apiToken, managementUrl }) => ({
			apiToken: Redacted.make(apiToken),
			managementUrl,
		})),
		Effect.orDie,
	),
);

/** Convenience layer from a plain token + optional management URL. */
export const credentials = (config: {
	readonly apiToken: string;
	readonly managementUrl?: string;
}): Layer.Layer<Credentials> =>
	Layer.succeed(
		Credentials,
		Effect.succeed({
			apiToken: Redacted.make(config.apiToken),
			managementUrl: config.managementUrl ?? DEFAULT_API_BASE_URL,
		}),
	);
