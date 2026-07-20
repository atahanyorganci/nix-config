import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

export const DEFAULT_API_BASE_URL = "https://api.hetzner.cloud/v1";

export interface CredentialsConfig {
	readonly apiToken: Redacted.Redacted<string>;
	readonly apiBaseUrl: string;
}

export class Credentials extends Context.Service<Credentials, Effect.Effect<CredentialsConfig>>()(
	"HetznerCredentials",
) {}

/**
 * Resolve Hetzner Cloud credentials from Effect `Config` (default provider: env).
 *
 * Required: `HETZNER_API_TOKEN`
 * Optional: `HETZNER_API_BASE_URL` (defaults to {@link DEFAULT_API_BASE_URL})
 */
export const CredentialsFromEnv = Layer.succeed(
	Credentials,
	Effect.gen(function* () {
		const apiToken = yield* Config.redacted("HETZNER_API_TOKEN");
		const apiBaseUrl = yield* Config.string("HETZNER_API_BASE_URL").pipe(Config.withDefault(DEFAULT_API_BASE_URL));
		return { apiToken, apiBaseUrl };
	}).pipe(Effect.orDie),
);

/**
 * Provide explicit Hetzner Cloud credentials.
 */
export const CredentialsFromConfig = (input: { apiToken: Redacted.Redacted<string> | string; apiBaseUrl: string }) => {
	const apiToken = typeof input.apiToken === "string" ? Redacted.make(input.apiToken) : input.apiToken;
	return Layer.succeed(Credentials, Effect.succeed({ apiToken, apiBaseUrl: input.apiBaseUrl }));
};
