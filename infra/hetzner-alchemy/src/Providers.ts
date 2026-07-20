import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import { CredentialsFromEnv } from "./Credentials.ts";
import { FirewallProvider } from "./Firewall/Firewall.ts";
import { PrimaryIpProvider } from "./PrimaryIp/PrimaryIp.ts";
import { ServerProvider } from "./Server/Server.ts";
import { SshKeyProvider } from "./SshKey/SshKey.ts";

export type ProviderRequirements = Layer.Services<ReturnType<typeof providers>>;

/**
 * Hetzner resource providers (SshKey, Firewall, PrimaryIp, Server).
 * Pair with {@link CredentialsFromEnv} or `CredentialsFromConfig` as needed.
 */
export const resourceProviders = () =>
	Layer.mergeAll(SshKeyProvider(), FirewallProvider(), PrimaryIpProvider(), ServerProvider());

/**
 * Build the complete Hetzner providers Layer for stack deploys.
 * Resolves credentials from Effect `Config` (`HETZNER_API_TOKEN`).
 */
export const providers = () =>
	resourceProviders().pipe(Layer.provideMerge(CredentialsFromEnv), Layer.provideMerge(FetchHttpClient.layer));
