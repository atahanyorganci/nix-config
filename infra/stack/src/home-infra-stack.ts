import * as Alchemy from "alchemy";
import type { Output } from "alchemy/Output";

export interface HomeInfraPeerOutput {
	hostname: string | Output<string>;
	peerId: string | Output<string>;
}

export interface HomeInfraOutputs {
	peers: Record<string, HomeInfraPeerOutput>;
	services: Record<string, string>;
}

export class HomeInfra extends Alchemy.Stack<HomeInfra, HomeInfraOutputs>()("HomeInfra") {}
