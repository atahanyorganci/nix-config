import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import { CredentialsFromEnv } from "./Credentials.ts";
import { GroupProvider } from "./Group/Group.ts";
import { NetworkProvider } from "./Network/Network.ts";
import { PeerProvider } from "./Peer/Peer.ts";
import { ReverseProxyDomainProvider } from "./ReverseProxyDomain/ReverseProxyDomain.ts";
import { ReverseProxyServiceProvider } from "./ReverseProxyService/ReverseProxyService.ts";
import { SetupProvider } from "./Setup/Setup.ts";
import { SetupKeyProvider } from "./SetupKey/SetupKey.ts";
import { UserProvider } from "./User/User.ts";

export type ProviderRequirements = Layer.Services<ReturnType<typeof providers>>;

/**
 * NetBird resource providers (Setup, Group, Network, Peer, SetupKey, User, reverse proxy).
 * Pair with {@link CredentialsFromEnv} or `CredentialsFromConfig` as needed.
 */
export const resourceProviders = () =>
	Layer.mergeAll(
		SetupProvider(),
		GroupProvider(),
		NetworkProvider(),
		PeerProvider(),
		SetupKeyProvider(),
		UserProvider(),
		ReverseProxyDomainProvider(),
		ReverseProxyServiceProvider(),
	);

/**
 * Build the complete NetBird providers Layer for stack deploys.
 * Resolves credentials from Effect `Config` (`NETBIRD_API_TOKEN`).
 */
export const providers = () =>
	resourceProviders().pipe(Layer.provideMerge(CredentialsFromEnv), Layer.provideMerge(FetchHttpClient.layer));
