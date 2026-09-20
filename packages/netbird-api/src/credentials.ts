import * as Config from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Ref from "effect/Ref";

export const DEFAULT_API_BASE_URL = "https://api.netbird.io";

export interface CredentialsConfig {
	readonly apiToken: Redacted.Redacted<string>;
	readonly apiBaseUrl: string;
}

export class Credentials extends Context.Service<Credentials, Effect.Effect<CredentialsConfig>>()(
	"NetbirdCredentials",
) {}

export type CredentialsRef = Ref.Ref<Record<string, string>>;

const credentialsFromProvider = (provider: ConfigProvider.ConfigProvider) =>
	Layer.succeed(
		Credentials,
		Effect.gen(function* () {
			const apiToken = yield* Config.redacted("NETBIRD_API_TOKEN").pipe(
				Config.orElse(() => Config.succeed(Redacted.make(""))),
			);
			const apiBaseUrl = yield* Config.string("NETBIRD_API_BASE_URL").pipe(Config.withDefault(DEFAULT_API_BASE_URL));
			return { apiToken, apiBaseUrl };
		}).pipe(Effect.provideService(ConfigProvider.ConfigProvider, provider), Effect.orDie),
	);

/**
 * Resolve credentials from the process environment at API-call time.
 */
export const CredentialsFromEnv = credentialsFromProvider(ConfigProvider.fromEnv());

/**
 * A ConfigProvider backed by a Ref, with process environment fallback.
 *
 * This permits an Alchemy action to hydrate credentials after `NetBird.Setup`
 * and makes the PAT visible to downstream resources in the same apply.
 */
export const CredentialsFromRef = (credentials: CredentialsRef) =>
	credentialsFromProvider(
		ConfigProvider.orElse(
			ConfigProvider.make(path =>
				Ref.get(credentials).pipe(Effect.flatMap(values => ConfigProvider.fromUnknown(values).load(path))),
			),
			ConfigProvider.fromEnv(),
		),
	);

/**
 * Provide explicit NetBird credentials (e.g. from a Docker test fixture).
 */
export const CredentialsFromConfig = (input: { apiToken: Redacted.Redacted<string> | string; apiBaseUrl: string }) => {
	const apiToken = typeof input.apiToken === "string" ? Redacted.make(input.apiToken) : input.apiToken;
	return Layer.succeed(Credentials, Effect.succeed({ apiToken, apiBaseUrl: input.apiBaseUrl }));
};
