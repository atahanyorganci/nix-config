import * as Alchemy from "alchemy";
import type * as Redacted from "effect/Redacted";

export interface HomeInfraPeerOutput {
	hostname: string;
	peerId: string;
}

export interface HomeInfraGroupOutput {
	groupId: string;
	name: string;
}

export interface HomeInfraNameserverOutput {
	nameserverGroupId: string;
	host: string;
	ip: string;
}

export interface HomeInfraOwnerOutput {
	userId: string;
	email: string;
	autoGroups: ReadonlyArray<string>;
}

export interface HomeInfraAgentNetworkOutput {
	/** Hostname NetBird allocated; pin it as `flake.agentNetwork.gateway.endpoint`. */
	endpoint: string;
	url: string;
	/** Provider name -> NetBird provider id. */
	providers: Record<string, string>;
	/** Policy name -> NetBird policy id. */
	policies: Record<string, string>;
}

export interface HomeInfraAxiomOutput {
	/** OTLP/HTTP base URL of the dataset's edge deployment; the collector appends `/v1/<signal>`. */
	endpoint: string;
	/**
	 * Bearer for `otel-ingest`, which can only create events in `dataset`.
	 * Encrypted in state; `just connect-axiom <host>` writes it to nix-secrets.
	 */
	token: Redacted.Redacted<string>;
	/** `infra.axiom.dataset`. */
	dataset: string;
	/** Dashboard uids: `https://app.axiom.co/<org>/dashboards/<uid>`. */
	dashboards: { overview: string; weekly: string };
	/** Monitor name -> Axiom monitor id. */
	monitors: Record<string, string>;
}

/**
 * How an app reaches its logical database, which has the app's name: its
 * role's direct (port 5432) connection, which PlanetScale only accepts over
 * TLS. `just store-secret` writes the values an app needs to nix-secrets.
 */
export interface HomeInfraPostgresRoleOutput {
	host: string;
	port: number;
	/** The app's logical database. */
	database: string;
	/** `<role>.<branch-id>`. */
	username: string;
	/** Encrypted in state. */
	password: Redacted.Redacted<string>;
	/**
	 * libpq URL verifying TLS against the system CA store (`sslrootcert=system`,
	 * libpq 16 and later). Carries the password, so it is encrypted in state.
	 * Clients that are not libpq build their own from the parts: sqlx (LLDAP)
	 * reads `sslrootcert` as a file path, and Authelia takes no URL at all.
	 */
	url: Redacted.Redacted<string>;
}

export interface HomeInfraPostgresOutput {
	/** The PlanetScale dashboard page of the cluster. */
	dashboard: string;
	/** App name -> how it reaches its logical database. */
	roles: Record<string, HomeInfraPostgresRoleOutput>;
}

export interface HomeInfraIdentityProviderOutput {
	/** NetBird's ID for the provider, which is also the embedded IdP's connector ID. */
	idpId: string;
	/** Redirect URI the provider's client must allow. */
	redirectUrl: string;
}

export interface HomeInfraOutputs {
	peers: Record<string, HomeInfraPeerOutput>;
	groups: Record<string, HomeInfraGroupOutput>;
	services: Record<string, string>;
	dns: Record<string, HomeInfraNameserverOutput>;
	owner: HomeInfraOwnerOutput;
	policies: {
		allowRuleCount: number;
		legacyDefaultDisabled: boolean;
	};
	/** Present while `flake.agentNetwork.enable` is set. */
	agentNetwork?: HomeInfraAgentNetworkOutput;
	axiom: HomeInfraAxiomOutput;
	postgres: HomeInfraPostgresOutput;
	/** `flake.identityProviders` key -> the provider NetBird offers at login. */
	identityProviders: Record<string, HomeInfraIdentityProviderOutput>;
}

export class HomeInfra extends Alchemy.Stack<HomeInfra, HomeInfraOutputs>()("HomeInfra") {}
