import { CredentialsStoreLive } from "alchemy/Auth/Credentials";
import { ProfileStoreLive } from "alchemy/Auth/Profile";
import * as Planetscale from "alchemy/Planetscale";
import * as Provider from "alchemy/Provider";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";
import { AppDatabase, AppDatabaseProvider } from "./AppDatabase.ts";

export class Providers extends Provider.ProviderCollection<Providers>()("Postgres") {}

/**
 * Register the providers for every Postgres resource. They make their admin
 * roles through PlanetScale's API, so they resolve PlanetScale credentials the
 * way `Planetscale.providers()` does: from the Alchemy profile.
 */
export const providers = () =>
	Layer.effect(Providers, Provider.collection([AppDatabase])).pipe(
		Layer.provide(AppDatabaseProvider()),
		Layer.provide(Planetscale.fromAuthProvider()),
		Layer.provide(FetchHttpClient.layer),
		Layer.provide(Planetscale.Auth.PlanetscaleAuth),
		Layer.provide(ProfileStoreLive),
		Layer.provide(CredentialsStoreLive),
		Layer.orDie,
	);
