import { CredentialsStoreLive } from "alchemy/Auth/Credentials";
import { ProfileStoreLive } from "alchemy/Auth/Profile";
import * as Provider from "alchemy/Provider";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";
import { ApiKey, ApiKeyProvider } from "./ApiKey/ApiKey.ts";
import { NetBirdAuth } from "./AuthProvider.ts";
import * as Credentials from "./Credentials.ts";
import { Group, GroupProvider } from "./Group/Group.ts";
import { NameserverGroup, NameserverGroupProvider } from "./NameserverGroup/NameserverGroup.ts";
import { Network, NetworkProvider } from "./Network/Network.ts";
import { NetworkResource, NetworkResourceProvider } from "./NetworkResource/NetworkResource.ts";
import { NetworkRouter, NetworkRouterProvider } from "./NetworkRouter/NetworkRouter.ts";
import { Peer, PeerProvider } from "./Peer/Peer.ts";
import { Policy, PolicyProvider } from "./Policy/Policy.ts";
import { PostureCheck, PostureCheckProvider } from "./PostureCheck/PostureCheck.ts";
import { ReverseProxyDomain, ReverseProxyDomainProvider } from "./ReverseProxyDomain/ReverseProxyDomain.ts";
import { ReverseProxyService, ReverseProxyServiceProvider } from "./ReverseProxyService/ReverseProxyService.ts";
import { Route, RouteProvider } from "./Route/Route.ts";
import { Setup, SetupProvider } from "./Setup/Setup.ts";
import { SetupKey, SetupKeyProvider } from "./SetupKey/SetupKey.ts";
import { User, UserProvider } from "./User/User.ts";

export class Providers extends Provider.ProviderCollection<Providers>()("NetBird") {}

export type ProviderRequirements = Layer.Services<ReturnType<typeof providers>>;

/**
 * Build a layer that registers all NetBird resource providers, the NetBird
 * `AuthProvider`, the resolved `Credentials`, and an `HttpClient`. Include
 * this from your stack alongside other cloud `providers()` layers.
 *
 * Resource providers are inserted into {@link Provider.collection} as they
 * land.
 *
 * @example
 * ```typescript
 * import * as NetBird from "@yorganci/netbird-alchemy";
 * import * as Alchemy from "alchemy";
 * import * as Effect from "effect/Effect";
 *
 * export default Alchemy.Stack(
 *   "MyStack",
 *   {
 *     providers: NetBird.providers(),
 *     state: Alchemy.localState(),
 *   },
 *   Effect.gen(function* () {
 *     return {};
 *   }),
 * );
 * ```
 */
export const providers = () =>
	Layer.effect(
		Providers,
		Provider.collection([
			ApiKey,
			Group,
			NameserverGroup,
			Network,
			NetworkResource,
			NetworkRouter,
			Peer,
			Policy,
			PostureCheck,
			ReverseProxyDomain,
			ReverseProxyService,
			Route,
			Setup,
			SetupKey,
			User,
		]),
	).pipe(
		Layer.provide(
			Layer.mergeAll(
				ApiKeyProvider(),
				GroupProvider(),
				NameserverGroupProvider(),
				NetworkProvider(),
				NetworkResourceProvider(),
				NetworkRouterProvider(),
				PeerProvider(),
				PolicyProvider(),
				PostureCheckProvider(),
				ReverseProxyDomainProvider(),
				ReverseProxyServiceProvider(),
				RouteProvider(),
				SetupProvider(),
				SetupKeyProvider(),
				UserProvider(),
			),
		),
		Layer.provideMerge(Credentials.fromAuthProvider()),
		Layer.provideMerge(NetBirdAuth),
		Layer.provideMerge(ProfileStoreLive),
		Layer.provideMerge(CredentialsStoreLive),
		Layer.provideMerge(FetchHttpClient.layer),
		Layer.orDie,
	);
