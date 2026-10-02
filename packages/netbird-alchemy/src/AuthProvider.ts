import { DEFAULT_API_BASE_URL } from "@yorganci/netbird-api";
import { getEnv, getEnvRedactedRequired } from "alchemy/Auth/Env";
import {
	makeStoredAuthProvider,
	storedSecret,
	storedValueText,
	type StoredAuthConfig,
} from "alchemy/Auth/StoredAuthProvider";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

export const NETBIRD_AUTH_PROVIDER_NAME = "NetBird";
export const NB_PAT_ENV = "NB_PAT";
export const NB_MANAGEMENT_URL_ENV = "NB_MANAGEMENT_URL";

export type NetBirdAuthConfig = StoredAuthConfig;

export type NetBirdResolvedCredentials = {
	type: "apiToken";
	apiToken: Redacted.Redacted<string>;
	managementUrl: string;
	source: { type: NetBirdAuthConfig["method"] | "env"; details?: string };
};

const netbirdAuth = makeStoredAuthProvider<NetBirdResolvedCredentials>({
	provider: NETBIRD_AUTH_PROVIDER_NAME,
	fields: [
		{ name: "apiToken", label: "NetBird Personal Access Token", secret: true },
		{
			name: "managementUrl",
			label: "NetBird management URL",
			optional: true,
			placeholder: DEFAULT_API_BASE_URL,
		},
	],
	toResolved: values => ({
		type: "apiToken",
		apiToken: storedSecret(values.apiToken) ?? Redacted.make(""),
		managementUrl: storedValueText(values.managementUrl) ?? DEFAULT_API_BASE_URL,
		source: { type: "stored" },
	}),
	readEnvironment: Effect.all({
		apiToken: getEnvRedactedRequired(NB_PAT_ENV),
		managementUrl: getEnv(NB_MANAGEMENT_URL_ENV),
	}).pipe(
		Effect.map(({ apiToken, managementUrl }) => ({
			type: "apiToken" as const,
			apiToken,
			managementUrl: managementUrl ?? DEFAULT_API_BASE_URL,
			source: {
				type: "env" as const,
				details: managementUrl ? `${NB_PAT_ENV}, ${NB_MANAGEMENT_URL_ENV}` : NB_PAT_ENV,
			},
		})),
	),
	environment: [
		{ name: NB_PAT_ENV, required: true, secret: true },
		{ name: NB_MANAGEMENT_URL_ENV, required: false },
	],
});

/**
 * Layer that registers the NetBird {@link AuthProvider} into the
 * {@link AuthProviders} registry. Include this in the NetBird `providers()`
 * layer so the alchemy CLI can discover it.
 *
 * Auth is a NetBird personal access token (`NB_PAT`). There is no OAuth
 * flow. An optional `NB_MANAGEMENT_URL` points at a self-hosted management
 * server (default `https://api.netbird.io`).
 */
export const NetBirdAuth = netbirdAuth.layer;
