import { isResourceState } from "alchemy/State";
import * as State from "alchemy/State";
import { REDACTED_MARKER, reviveStateRecursive } from "alchemy/State/StateEncoding";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

export const ADMIN_API_KEY_FQN = "AdminApiKey";
export const NETBIRD_SERVER_STACK = "NetbirdServer";

export interface NetbirdCredentials {
	apiBaseUrl: string;
	apiToken: Redacted.Redacted<string>;
}

const readString = (value: unknown, label: string): Effect.Effect<string> =>
	Effect.gen(function* () {
		if (Redacted.isRedacted(value)) {
			const token = Redacted.value(value);
			if (typeof token === "string" && token.length > 0) {
				return token;
			}
		}

		if (typeof value === "object" && value !== null && REDACTED_MARKER in value) {
			const token = (value as Record<string, unknown>)[REDACTED_MARKER];
			if (typeof token === "string" && token.length > 0) {
				return token;
			}
		}

		const revived = reviveStateRecursive(value);
		if (typeof revived === "string" && revived.length > 0) {
			return revived;
		}
		if (Redacted.isRedacted(revived)) {
			const token = Redacted.value(revived);
			if (typeof token === "string" && token.length > 0) {
				return token;
			}
		}

		return yield* Effect.die(`${label} is missing or empty in NetbirdServer stack state`);
	});

export const readNetbirdCredentials = (stage: string) =>
	Effect.gen(function* () {
		const state = yield* yield* State.State;

		const output = yield* state.getOutput({ stack: NETBIRD_SERVER_STACK, stage });
		if (output == null) {
			return yield* Effect.die(
				`NetbirdServer stack has no output for stage "${stage}" — deploy stack/netbird-server.ts first`,
			);
		}

		const apiBaseUrlValue =
			typeof output === "object" && output !== null && "apiBaseUrl" in output ? output.apiBaseUrl : undefined;
		const apiBaseUrl = yield* readString(apiBaseUrlValue, "apiBaseUrl");

		const apiKeyState = yield* state.get({
			stack: NETBIRD_SERVER_STACK,
			stage,
			fqn: ADMIN_API_KEY_FQN,
		});
		if (!isResourceState(apiKeyState) || apiKeyState.attr?.token === undefined) {
			return yield* Effect.die(
				`NetBird AdminApiKey resource not found in NetbirdServer/${stage} — deploy stack/netbird-server.ts first`,
			);
		}

		const apiToken = yield* readString(apiKeyState.attr.token, "AdminApiKey token");

		return { apiBaseUrl, apiToken: Redacted.make(apiToken) } satisfies NetbirdCredentials;
	});
