import { ConfigError } from "@distilled.cloud/core/errors";
import { Credentials } from "@yorganci/netbird-api";
import { deferUntilFirstUse, orDieCredentialsUnavailable, resolveProviderConfig } from "alchemy/Auth/Resolve";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { NETBIRD_AUTH_PROVIDER_NAME, type NetBirdAuthConfig, type NetBirdResolvedCredentials } from "./AuthProvider.ts";

export {
	Credentials,
	CredentialsFromEnv,
	credentials,
	DEFAULT_API_BASE_URL,
	type Config as CredentialsConfig,
} from "@yorganci/netbird-api";

/**
 * Build a NetBird `Credentials` layer that resolves credentials via the
 * Alchemy AuthProvider using the configured profile (defaults to "default",
 * overridable with the `ALCHEMY_PROFILE` env/config value).
 *
 * Maps onto `@yorganci/netbird-api`'s `{ apiToken, managementUrl }` shape.
 * The `Credentials` service is an `Effect<Config>` resolved per request.
 * Environment credentials (`NB_PAT`) take precedence; otherwise the selected
 * profile is used.
 */
export const fromAuthProvider = () =>
	Layer.effect(
		Credentials,
		Effect.gen(function* () {
			// Defer profile lookup and credential resolution until first use, so
			// building the provider layers never requires a configured profile.
			const resolve = yield* resolveProviderConfig<NetBirdAuthConfig, NetBirdResolvedCredentials>(
				NETBIRD_AUTH_PROVIDER_NAME,
			).pipe(
				Effect.flatMap(({ profileName, resolve }) =>
					resolve.pipe(
						Effect.map(creds => ({
							apiToken: creds.apiToken,
							managementUrl: creds.managementUrl,
						})),
						Effect.mapError(
							e =>
								new ConfigError({
									message: `Failed to resolve NetBird credentials from ${profileName === undefined ? "the CI environment" : `profile '${profileName}'`}: ${(e as { message?: string }).message ?? String(e)}`,
								}),
						),
					),
				),
				deferUntilFirstUse,
			);
			return yield* resolve.pipe(orDieCredentialsUnavailable(NETBIRD_AUTH_PROVIDER_NAME), Effect.cached);
		}),
	);
