import { actionsIdGet } from "@yorganci/hetzner-api/actionsIdGet";
import * as Effect from "effect/Effect";

export type HetznerAction = {
	id: number;
	status: "running" | "success" | "error";
	error: { code: string; message: string } | null;
};

/** Poll `GET /actions/{id}` until the action succeeds or fails. */
export const waitForAction = (actionId: number) =>
	Effect.gen(function* () {
		for (;;) {
			const { action } = yield* actionsIdGet({ id: actionId });
			if (action.status === "success") return action;
			if (action.status === "error") {
				const detail = action.error ? `${action.error.code}: ${action.error.message}` : "unknown error";
				return yield* Effect.die(new Error(`Hetzner action ${actionId} failed (${detail})`));
			}
			yield* Effect.sleep("2 seconds");
		}
	});

/** Wait for zero or more actions (skips missing/undefined entries). */
export const waitForActions = (actions: ReadonlyArray<HetznerAction | { id: number } | null | undefined> | undefined) =>
	Effect.gen(function* () {
		for (const action of actions ?? []) {
			if (action == null) continue;
			yield* waitForAction(action.id);
		}
	});
