import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import { CredentialsFromEnv } from "./Credentials.ts";
import { GroupProvider } from "./Group/Group.ts";
import { NetworkProvider } from "./Network/Network.ts";
import { PeerProvider } from "./Peer/Peer.ts";
import { SetupKeyProvider } from "./SetupKey/SetupKey.ts";

export type ProviderRequirements = Layer.Services<ReturnType<typeof providers>>;

/**
 * NetBird resource providers (Group, Network, Peer, SetupKey).
 * Pair with {@link CredentialsFromEnv} or `CredentialsFromConfig` as needed.
 */
export const resourceProviders = () =>
	Layer.mergeAll(GroupProvider(), NetworkProvider(), PeerProvider(), SetupKeyProvider());

/**
 * Build the complete NetBird providers Layer for stack deploys.
 * Includes credentials from the environment and a Fetch HTTP client.
 */
export const providers = () =>
	Layer.mergeAll(resourceProviders(), CredentialsFromEnv, FetchHttpClient.layer);
