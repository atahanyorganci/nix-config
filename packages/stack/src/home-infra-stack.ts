import * as Alchemy from "alchemy";

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
}

export class HomeInfra extends Alchemy.Stack<HomeInfra, HomeInfraOutputs>()("HomeInfra") {}
