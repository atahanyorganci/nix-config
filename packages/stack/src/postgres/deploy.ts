import * as Alchemy from "alchemy";
import * as Output from "alchemy/Output";
import * as Planetscale from "alchemy/Planetscale";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import { AppDatabase } from "./AppDatabase.ts";

/** Postgres itself, as in a role's `connectionUrl`; PgBouncer listens on 6432. */
const DIRECT_PORT = 5432;

/**
 * An app's role and its logical database, both named after the app; returns
 * how the app reaches the database over a direct connection: the parts, and a
 * libpq URL verifying TLS against the system CA store.
 *
 * The role inherits no built-in roles: those apply to every logical database
 * in the cluster, while the role owns what it creates in its own.
 */
const app = Effect.fn("app")(function* (logicalId: string, name: string, database: Planetscale.PostgresDatabase) {
	const role = yield* Planetscale.PostgresRole(`${logicalId}Role`, {
		name,
		database,
		inheritedRoles: [],
	});

	yield* AppDatabase(`${logicalId}Database`, {
		organization: role.organization,
		database: role.database,
		branch: role.branch,
		name,
		// Inside Postgres the role is the part of its username before the branch id.
		role: role.username.pipe(Output.map(username => username.slice(0, username.lastIndexOf(".")))),
	});

	return {
		host: role.host,
		port: DIRECT_PORT,
		database: name,
		username: role.username,
		password: role.password,
		url: role.connectionUrl.pipe(
			Output.map(connectionUrl => {
				const url = new URL(Redacted.value(connectionUrl));
				// PlanetScale's URL names its default `postgres` database.
				url.pathname = `/${name}`;
				url.searchParams.set("sslrootcert", "system");
				return Redacted.make(url.toString());
			}),
		),
	};
});

/**
 * The cluster, and one role and logical database per app that connects to it.
 *
 * The cluster is retained: destroying the stack must never delete the data in
 * it, and neither does removing an app's database. PlanetScale returns a
 * role's password only when it creates the role, so changing anything but a
 * role's name replaces it with a fresh password, which then has to reach the
 * host again.
 */
export const deploy = Effect.fn("deploy")(function* () {
	const database = yield* Planetscale.PostgresDatabase("PostgresCluster", {
		name: "infra",
		region: {
			slug: "eu-central",
		},
		clusterSize: "PS_5",
		replicas: 0,
	}).pipe(Alchemy.RemovalPolicy.retain());

	return {
		dashboard: database.htmlUrl,
		roles: {
			vaultwarden: yield* app("Vaultwarden", "vaultwarden", database),
			// Authelia's storage: 2FA devices, passkeys, OIDC consents and tokens, bans.
			authelia: yield* app("Authelia", "authelia", database),
			// LLDAP's directory: the users and groups Authelia authenticates against.
			lldap: yield* app("Lldap", "lldap", database),
		},
	};
});
