import * as Alchemy from "alchemy";
import type { Output } from "alchemy/Output";

export interface HomeInfraPeerOutput {
	hostname: string | Output<string>;
	peerId: string | Output<string>;
}

export interface HomeInfraGroupOutput {
	groupId: string | Output<string>;
	name: string | Output<string>;
}

export interface HomeInfraNameserverOutput {
	nameserverGroupId: string | Output<string>;
	host: string;
	ip: string | Output<string>;
}

export interface HomeInfraOutputs {
	peers: Record<string, HomeInfraPeerOutput>;
	groups: Record<string, HomeInfraGroupOutput>;
	services: Record<string, string>;
	dns: Record<string, HomeInfraNameserverOutput>;
}

export class HomeInfra extends Alchemy.Stack<HomeInfra, HomeInfraOutputs>()("HomeInfra") {}
