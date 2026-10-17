import * as Alchemy from "alchemy";
import * as Output from "alchemy/Output";
import * as Planetscale from "alchemy/Planetscale";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

/**
 * The cluster, and one role per app that connects to it.
 *
 * The cluster is retained: destroying the stack must never delete the data in
 * it. PlanetScale returns a role's password only when it creates the role, so
 * changing anything but a role's name replaces it with a fresh password, which
 * then has to reach the host again.
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

	const vaultwarden = yield* Planetscale.PostgresRole("VaultwardenRole", {
		name: "vaultwarden",
		database,
		inheritedRoles: [],
	});

	return {
		dashboard: database.htmlUrl,
		roles: {
			vaultwarden: vaultwarden.connectionUrl.pipe(
				Output.map(connectionUrl => {
					const url = new URL(Redacted.value(connectionUrl));
					url.searchParams.set("sslrootcert", "system");
					return Redacted.make(url.toString());
				}),
			),
		},
	};
});
