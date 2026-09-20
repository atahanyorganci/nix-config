import { DEFAULT_API_BASE_URL } from "@yorganci/netbird-api/Credentials";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

interface NetbirdCredentials {
	apiBaseUrl: string;
	apiToken: Redacted.Redacted<string>;
}

/**
 * NetBird credentials for the CLI scripts.
 *
 * Read from the ambient Effect `ConfigProvider` rather than
 * `CredentialsFromEnv`: the scripts accept `--env-file`, and those values are
 * loaded into the ambient provider only. `ConfigProvider.fromEnv()` snapshots
 * `process.env` and would silently miss them.
 *
 * An absent `NETBIRD_API_BASE_URL` falls back to the NetBird cloud API, which
 * is never right for this self-hosted account, so it is required here.
 */
export const netbirdCredentialsFromConfig = Effect.gen(function* () {
	const apiToken = yield* Config.redacted("NETBIRD_API_TOKEN").pipe(
		Config.orElse(() => Config.succeed(Redacted.make(""))),
	);
	if (Redacted.value(apiToken).length === 0) {
		return yield* Effect.die(
			"NETBIRD_API_TOKEN is unset or empty — export it, set it in " +
				"packages/stack/.env.local, or pass --env-file. Mint a token from the " +
				"NetBird dashboard (Settings → Access Tokens).",
		);
	}

	const apiBaseUrl = yield* Config.string("NETBIRD_API_BASE_URL").pipe(Config.orElse(() => Config.succeed("")));
	if (apiBaseUrl.length === 0) {
		return yield* Effect.die(
			`NETBIRD_API_BASE_URL is unset — set it to this account's management API ` +
				`(e.g. https://netbird.yorganci.dev). Leaving it unset would target ` +
				`${DEFAULT_API_BASE_URL} (NetBird cloud) and leak the token to the wrong host.`,
		);
	}

	return { apiBaseUrl, apiToken } satisfies NetbirdCredentials;
}).pipe(Effect.orDie);
