import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

export const IdentityProviderType = Schema.Literals([
	"oidc",
	"zitadel",
	"entra",
	"google",
	"okta",
	"pocketid",
	"microsoft",
	"adfs",
]);

/** A host's `identityProviders.<key>`. */
export const IdentityProviderConfig = Schema.Struct({
	name: Schema.String,
	type: IdentityProviderType,
	issuer: Schema.String,
	clientId: Schema.String,
	/** Key of the plaintext client secret in the host's nix-secrets file. */
	clientSecret: Schema.String,
});
export type IdentityProviderConfig = typeof IdentityProviderConfig.Type;

export const IdentityProviderHost = Schema.Struct({
	name: Schema.String,
	providers: Schema.Record(Schema.String, IdentityProviderConfig),
	/** The host's nix-secrets file at the locked revision; null when it has none. */
	secretsFile: Schema.NullOr(Schema.String),
});

/** `flake.identityProviders`: host name -> the providers it declares. */
export const IdentityProviders = Schema.Record(Schema.String, IdentityProviderHost);
export type IdentityProviders = typeof IdentityProviders.Type;

export interface IdentityProviderPlan {
	readonly hostKey: string;
	readonly providerKey: string;
	readonly cfg: IdentityProviderConfig;
	readonly secretsFile: string;
}

/**
 * One plan per provider, in a stable order. The flake already rejects a key
 * or name declared twice; a host without a nix-secrets file has nowhere to
 * keep the secret.
 */
export const plans = Effect.fn("IdentityProviders.plans")(function* (all: IdentityProviders) {
	const result: Array<IdentityProviderPlan> = [];
	for (const hostKey of Object.keys(all).sort()) {
		const host = all[hostKey]!;
		for (const providerKey of Object.keys(host.providers).sort()) {
			if (host.secretsFile === null) {
				return yield* Effect.die(
					new Error(`identity provider "${providerKey}" is declared on ${hostKey}, which has no nix-secrets file`),
				);
			}
			result.push({ hostKey, providerKey, cfg: host.providers[providerKey]!, secretsFile: host.secretsFile });
		}
	}
	return result;
});
