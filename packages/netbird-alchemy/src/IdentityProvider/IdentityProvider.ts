import {
	type IdentityProvider as ApiIdentityProvider,
	type IdentityProviderType,
	identityProvidersGet,
	identityProvidersIdpIdDelete,
	identityProvidersIdpIdPut,
	identityProvidersPost,
} from "@yorganci/netbird-api/identity_providers";
import { isResolved } from "alchemy/Diff";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";
import { Credentials } from "../Credentials.ts";
import { catchNotFound } from "../errors.ts";

export type { IdentityProviderType };

const DEFAULT_TYPE: IdentityProviderType = "oidc";

export interface IdentityProviderProps {
	/**
	 * Display name, shown on the button NetBird's login page offers for this
	 * provider. A provider of the same name and type that exists already is
	 * adopted rather than created again.
	 */
	name: string;
	/**
	 * Connector type. NetBird cannot change it in place, so changing it
	 * replaces the provider.
	 *
	 * @default "oidc"
	 */
	type?: IdentityProviderType;
	/**
	 * OIDC issuer URL, exactly as its discovery document states it. NetBird
	 * fetches `<issuer>/.well-known/openid-configuration` on create and on
	 * update and refuses an issuer it cannot reach or that names another, so
	 * the issuer must be up, and reachable from the management server, first.
	 * Not used by the `google` and `microsoft` types.
	 *
	 * @default ""
	 */
	issuer?: string;
	/** OAuth2 client ID registered with the provider. */
	clientId: string;
	/**
	 * OAuth2 client secret. Write-only: NetBird never returns it, so a change
	 * is detected against the last value deployed, and an adopted provider has
	 * it written once.
	 */
	clientSecret: Redacted.Redacted<string>;
}

export interface IdentityProviderAttributes {
	/**
	 * ID NetBird assigned, which is also the embedded IdP's connector ID:
	 * random, and prefixed with the type for every type but `oidc`.
	 */
	idpId: string;
	type: IdentityProviderType;
	/** Display name reported by NetBird. */
	name: string;
	/** Issuer reported by NetBird. */
	issuer: string;
	/** Client ID reported by NetBird. */
	clientId: string;
	/**
	 * Where the provider sends users back: the embedded IdP's callback,
	 * `<management URL>/oauth2/callback`. It is the same URL for every provider
	 * (the IdP tells them apart by the OAuth2 state), so it can be registered
	 * with the provider before this resource exists.
	 */
	redirectUrl: string;
	/**
	 * Post-logout redirect URL, for providers that support one:
	 * `<management URL>/oauth2/logout/callback`.
	 */
	logoutUrl: string;
}

export type IdentityProvider = Resource<"NetBird.IdentityProvider", IdentityProviderProps, IdentityProviderAttributes>;

/**
 * An external identity provider for NetBird's embedded IdP (Dex), offered on
 * its login page next to local users: logins to the dashboard, the CLI, and
 * reverse-proxy SSO can go through it.
 *
 * Requires a self-hosted management server running the embedded IdP. For the
 * `oidc` type the connector requests the `openid`, `profile` and `email`
 * scopes (`okta` and `pocketid` add `groups`), and reads the user from the ID
 * token alone, without calling userinfo: the provider has to put `name` and
 * `email` in the ID token.
 *
 * @resource
 * @product Identity Providers
 * @category NetBird
 * @section Adding an Identity Provider
 * @example Generic OIDC provider
 * ```typescript
 * const authelia = yield* NetBird.IdentityProvider("Authelia", {
 *   name: "Authelia",
 *   issuer: "https://auth.example.com",
 *   clientId: "netbird",
 *   clientSecret: Redacted.make(secret),
 * });
 * // authelia.redirectUrl is the redirect URI to register for the client.
 * ```
 */
export const IdentityProvider = Resource<IdentityProvider>("NetBird.IdentityProvider");

export const isIdentityProvider = (value: unknown): value is IdentityProvider =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.IdentityProvider";

export const IdentityProviderProvider = () =>
	Provider.succeed(IdentityProvider, {
		stables: ["idpId", "type", "redirectUrl", "logoutUrl"],
		diff: ({ news, olds }) =>
			Effect.sync(() => {
				if (!isResolved(news) || !olds) return undefined;
				if ((news.type ?? DEFAULT_TYPE) !== (olds.type ?? DEFAULT_TYPE)) {
					return { action: "replace" } as const;
				}
			}),
		read: Effect.fn(function* ({ output, olds }) {
			const urls = yield* callbackUrls;
			if (output?.idpId) {
				const direct = yield* findById(output.idpId);
				if (direct) return toAttributes(direct, urls);
			}
			const name = olds?.name ?? output?.name;
			if (!name) return undefined;
			const existing = yield* findByName(name, olds?.type ?? output?.type ?? DEFAULT_TYPE);
			return existing ? toAttributes(existing, urls) : undefined;
		}),
		list: Effect.fn(function* () {
			const urls = yield* callbackUrls;
			const all = yield* identityProvidersGet({});
			return all.filter(idp => idp.id !== undefined).map(idp => toAttributes(idp, urls));
		}),
		reconcile: Effect.fn(function* ({ news, olds, output }) {
			const urls = yield* callbackUrls;
			const type = news.type ?? DEFAULT_TYPE;
			const desired = {
				name: news.name,
				issuer: news.issuer ?? "",
				client_id: news.clientId,
				client_secret: news.clientSecret,
			};

			let observed: ApiIdentityProvider | undefined;
			if (output?.idpId) {
				observed = yield* findById(output.idpId);
			}
			if (!observed) {
				observed = yield* findByName(news.name, type);
			}

			if (!observed) {
				const created = yield* identityProvidersPost({ type, ...desired }).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							// The create may have landed before the response was lost.
							const existing = yield* findByName(news.name, type);
							if (existing) return existing;
							return yield* Effect.fail(err);
						}),
					),
				);
				return toAttributes(created, urls);
			}

			// The secret cannot be read back: write it whenever it differs from
			// the last deployed value, or there is none (an adopted provider).
			const secretChanged = olds?.clientSecret === undefined || reveal(olds.clientSecret) !== reveal(news.clientSecret);
			const drifted =
				observed.name !== desired.name ||
				observed.issuer !== desired.issuer ||
				observed.client_id !== desired.client_id;
			if (!secretChanged && !drifted) {
				return toAttributes(observed, urls);
			}

			// PUT replaces the whole configuration, secret included.
			const updated = yield* identityProvidersIdpIdPut({
				idpId: requireId(observed),
				type: observed.type,
				...desired,
			});
			return toAttributes(updated, urls);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFound(identityProvidersIdpIdDelete({ idpId: output.idpId }));
		}),
	});

/**
 * The embedded IdP's issuer is `<management URL>/oauth2` on a combined server,
 * which builds every connector's redirect URI from it.
 */
const callbackUrls = Effect.gen(function* () {
	const credentials = yield* Credentials;
	const { managementUrl } = yield* credentials;
	const issuer = `${managementUrl.replace(/\/+$/, "")}/oauth2`;
	return { redirectUrl: `${issuer}/callback`, logoutUrl: `${issuer}/logout/callback` };
});

type CallbackUrls = Effect.Success<typeof callbackUrls>;

const listProviders = () =>
	identityProvidersGet({}).pipe(Effect.catch(() => Effect.succeed([] as ReadonlyArray<ApiIdentityProvider>)));

const findById = (idpId: string) => listProviders().pipe(Effect.map(all => all.find(idp => idp.id === idpId)));

const findByName = (name: string, type: IdentityProviderType) =>
	listProviders().pipe(Effect.map(all => all.find(idp => idp.name === name && idp.type === type)));

const reveal = (value: Redacted.Redacted<string> | string) =>
	Redacted.isRedacted(value) ? Redacted.value(value) : value;

const requireId = (idp: ApiIdentityProvider) => {
	if (idp.id === undefined) {
		throw new Error(`NetBird returned identity provider "${idp.name}" without an ID`);
	}
	return idp.id;
};

const toAttributes = (idp: ApiIdentityProvider, urls: CallbackUrls): IdentityProviderAttributes => ({
	idpId: requireId(idp),
	type: idp.type,
	name: idp.name,
	issuer: idp.issuer,
	clientId: idp.client_id,
	...urls,
});
