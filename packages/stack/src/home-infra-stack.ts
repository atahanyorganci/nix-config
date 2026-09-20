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
}

export class HomeInfra extends Alchemy.Stack<HomeInfra, HomeInfraOutputs>()("HomeInfra") {}
