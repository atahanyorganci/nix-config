import * as State from "alchemy/State";
import * as Effect from "effect/Effect";
import type { HomeInfraAxiomOutput, HomeInfraGroupOutput, HomeInfraOutputs } from "./home-infra-stack.ts";
import type { NetBirdGroupName } from "./inventory.ts";

export const HOME_INFRA_STACK = "HomeInfra";

const readOutput = (stage: string) =>
	Effect.gen(function* () {
		const state = yield* yield* State.State;
		const output = yield* state.getOutput({ stack: HOME_INFRA_STACK, stage });
		if (output == null) {
			return yield* Effect.die(`HomeInfra stack has no output for stage "${stage}" — deploy stack/home-infra.ts first`);
		}
		return output as HomeInfraOutputs;
	});

export const readHomeInfraGroupId = (stage: string, groupName: NetBirdGroupName) =>
	Effect.gen(function* () {
		const output = yield* readOutput(stage);
		const group = output.groups[groupName] as HomeInfraGroupOutput | undefined;
		if (!group?.groupId) {
			return yield* Effect.die(`HomeInfra output is missing group "${groupName}" for stage "${stage}"`);
		}
		return group.groupId;
	});

/** The Axiom dataset, endpoint and ingest token hosts ship telemetry with. */
export const readHomeInfraAxiom = (stage: string) =>
	Effect.gen(function* () {
		const output = yield* readOutput(stage);
		const axiom = output.axiom as HomeInfraAxiomOutput | undefined;
		if (!axiom?.endpoint || !axiom.token) {
			return yield* Effect.die(
				`HomeInfra output has no Axiom ingest token for stage "${stage}" — deploy stack/home-infra.ts first`,
			);
		}
		return axiom;
	});
