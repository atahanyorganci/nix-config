import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import { CredentialsFromEnv } from "./Credentials.ts";
import { GroupProvider } from "./Group/Group.ts";
import { NetworkProvider } from "./Network/Network.ts";
import { SetupKeyProvider } from "./SetupKey/SetupKey.ts";

export type ProviderRequirements = Layer.Services<ReturnType<typeof providers>>;

/**
 * NetBird resource providers only (Group, Network, SetupKey).
 * Pair with {@link CredentialsFromEnv} or `CredentialsFromConfig` as needed.
 */
export const resourceProviders = () => Layer.mergeAll(GroupProvider(), NetworkProvider(), SetupKeyProvider());

/**
 * Build the complete NetBird providers Layer for stack deploys.
 * Resolves credentials from Effect `Config` (`NETBIRD_API_TOKEN`).
 */
export const providers = () =>
	resourceProviders().pipe(Layer.provideMerge(CredentialsFromEnv), Layer.provideMerge(FetchHttpClient.layer));
