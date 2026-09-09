import * as State from "alchemy/State";
import * as Effect from "effect/Effect";
import type { HomeInfraGroupOutput, HomeInfraOutputs } from "./home-infra-stack.ts";
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
		if (typeof group.groupId === "string") {
			return group.groupId;
		}
		return yield* Effect.die(`HomeInfra group "${groupName}" id is unresolved in stage "${stage}"`);
	});
