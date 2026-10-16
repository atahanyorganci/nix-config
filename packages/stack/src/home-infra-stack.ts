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

export interface HomeInfraPostgresRoleOutput {
	/** PlanetScale API id of the role. */
	id: string;
	/** Display name in the PlanetScale dashboard. */
	name: string;
	host: string;
	/**
	 * `<role>.<branch-id>`: what clients connect as, so PlanetScale can route
	 * them. Inside Postgres the role is the part before the dot.
	 */
	username: string;
	/** Returned once, when the role is created; encrypted in state. */
	password: Redacted.Redacted<string>;
}

export interface HomeInfraPostgresOutput {
	/** PlanetScale database name. */
	database: string;
	/** PlanetScale region slug. */
	region: string;
	htmlUrl: string;
	/** App name -> its role; the app's logical database has the same name. */
	roles: Record<string, HomeInfraPostgresRoleOutput>;
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
}

export class HomeInfra extends Alchemy.Stack<HomeInfra, HomeInfraOutputs>()("HomeInfra") {}
