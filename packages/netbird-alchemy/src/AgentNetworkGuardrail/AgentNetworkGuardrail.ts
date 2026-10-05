import {
	agentNetworkGuardrailsGet,
	agentNetworkGuardrailsGuardrailIdDelete,
	agentNetworkGuardrailsGuardrailIdGet,
	agentNetworkGuardrailsGuardrailIdPut,
	agentNetworkGuardrailsPost,
} from "@yorganci/netbird-api/agent_network";
import { createPhysicalName } from "alchemy/PhysicalName";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import { catchNotFound, catchNotFoundOrUnavailable } from "../errors.ts";

export interface AgentNetworkModelAllowlist {
	/** @default true */
	enabled?: boolean;
	/** Model ids callers may request; any other model is denied. */
	models: ReadonlyArray<string>;
}

export interface AgentNetworkPromptCapture {
	/**
	 * Capture prompts and completions for the policies this guardrail is
	 * attached to. The account's `AgentGateway.promptCollection` is the
	 * master switch, and only `logCollection` stores what is captured.
	 *
	 * @default true
	 */
	enabled?: boolean;
	/** @default false */
	redactPii?: boolean;
}

export interface AgentNetworkGuardrailProps {
	/**
	 * Display name. Used as a stable identifier so the provider can locate
	 * the guardrail by name during adoption / state recovery. If omitted, a
	 * unique name is generated from the stack/stage/logical id.
	 *
	 * @default ${app}-${stage}-${id}
	 */
	name?: string;
	/** Omitted leaves the current description. */
	description?: string;
	/** Restrict the models callers may request. Omitted turns the check off. */
	modelAllowlist?: AgentNetworkModelAllowlist;
	/** Capture prompts and completions. Omitted turns the check off. */
	promptCapture?: AgentNetworkPromptCapture;
}

export interface AgentNetworkGuardrailAttributes {
	/** Guardrail id assigned by NetBird; policies reference it. */
	guardrailId: string;
	name: string;
	description: string;
	modelAllowlist: { enabled: boolean; models: ReadonlyArray<string> };
	promptCapture: { enabled: boolean; redactPii: boolean };
}

export type AgentNetworkGuardrail = Resource<
	"NetBird.AgentNetworkGuardrail",
	AgentNetworkGuardrailProps,
	AgentNetworkGuardrailAttributes
>;

/**
 * A reusable set of checks an `AgentNetworkPolicy` applies to the requests it
 * authorises: a model allowlist and prompt capture.
 *
 * @resource
 * @product Agent Network
 * @category NetBird
 * @section Creating a Guardrail
 * @example Capture prompts and allow one model
 * ```typescript
 * const guardrail = yield* NetBird.AgentNetworkGuardrail("Agents", {
 *   name: "agents",
 *   modelAllowlist: { models: ["gpt-4o-mini"] },
 *   promptCapture: { redactPii: true },
 * });
 * ```
 */
export const AgentNetworkGuardrail = Resource<AgentNetworkGuardrail>("NetBird.AgentNetworkGuardrail");

export const isAgentNetworkGuardrail = (value: unknown): value is AgentNetworkGuardrail =>
	Predicate.hasProperty(value, "Type") && value.Type === "NetBird.AgentNetworkGuardrail";

type ApiChecks = {
	model_allowlist: { enabled: boolean; models: ReadonlyArray<string> };
	prompt_capture: { enabled: boolean; redact_pii: boolean };
};

type ApiGuardrail = {
	id: string;
	name: string;
	description: string;
	checks: ApiChecks;
};

export const AgentNetworkGuardrailProvider = () =>
	Provider.succeed(AgentNetworkGuardrail, {
		stables: ["guardrailId"],
		read: Effect.fn(function* ({ id, output, olds }) {
			if (output?.guardrailId) {
				const direct = yield* catchNotFound(agentNetworkGuardrailsGuardrailIdGet({ guardrailId: output.guardrailId }));
				if (direct) return toAttributes(direct);
			}
			const name = yield* resolveName(id, olds?.name ?? output?.name);
			const existing = yield* findGuardrailByName(name);
			return existing ? toAttributes(existing) : undefined;
		}),
		list: Effect.fn(function* () {
			const all = yield* agentNetworkGuardrailsGet({});
			return all.map(toAttributes);
		}),
		reconcile: Effect.fn(function* ({ id, news, output }) {
			const props = news ?? ({} as AgentNetworkGuardrailProps);
			const name = yield* resolveName(id, props.name);
			const checks = toApiChecks(props);

			let observed: ApiGuardrail | undefined;
			if (output?.guardrailId) {
				observed = yield* catchNotFound(agentNetworkGuardrailsGuardrailIdGet({ guardrailId: output.guardrailId }));
			}
			if (!observed) {
				observed = yield* findGuardrailByName(name);
			}

			if (!observed) {
				const created = yield* agentNetworkGuardrailsPost({
					name,
					...(props.description !== undefined ? { description: props.description } : {}),
					checks,
				}).pipe(
					Effect.catch(err =>
						Effect.gen(function* () {
							const existing = yield* findGuardrailByName(name);
							if (existing) return existing;
							return yield* Effect.fail(err);
						}),
					),
				);
				return toAttributes(created);
			}

			const description = props.description ?? observed.description;
			if (observed.name !== name || observed.description !== description || !checksEqual(observed.checks, checks)) {
				const updated = yield* agentNetworkGuardrailsGuardrailIdPut({
					guardrailId: observed.id,
					name,
					description,
					checks,
				});
				return toAttributes(updated);
			}

			return toAttributes(observed);
		}),
		delete: Effect.fn(function* ({ output }) {
			yield* catchNotFoundOrUnavailable(agentNetworkGuardrailsGuardrailIdDelete({ guardrailId: output.guardrailId }));
		}),
	});

const resolveName = (id: string, name: string | undefined) =>
	Effect.gen(function* () {
		if (name) return name;
		return yield* createPhysicalName({ id, lowercase: true, maxLength: 64 });
	});

const findGuardrailByName = (name: string) =>
	agentNetworkGuardrailsGet({}).pipe(
		Effect.map((guardrails): ApiGuardrail | undefined => guardrails.find(guardrail => guardrail.name === name)),
		Effect.catch(() => Effect.succeed(undefined)),
	);

/** Both checks are always sent, so an omitted one is switched off rather than left as it was. */
const toApiChecks = (props: AgentNetworkGuardrailProps): ApiChecks => ({
	model_allowlist: props.modelAllowlist
		? { enabled: props.modelAllowlist.enabled ?? true, models: [...props.modelAllowlist.models] }
		: { enabled: false, models: [] },
	prompt_capture: props.promptCapture
		? { enabled: props.promptCapture.enabled ?? true, redact_pii: props.promptCapture.redactPii ?? false }
		: { enabled: false, redact_pii: false },
});

const normalizeChecks = (checks: ApiChecks) =>
	JSON.stringify({
		model_allowlist: {
			enabled: checks.model_allowlist.enabled,
			models: [...checks.model_allowlist.models].sort(),
		},
		prompt_capture: {
			enabled: checks.prompt_capture.enabled,
			redact_pii: checks.prompt_capture.redact_pii,
		},
	});

const checksEqual = (a: ApiChecks, b: ApiChecks) => normalizeChecks(a) === normalizeChecks(b);

const toAttributes = (guardrail: ApiGuardrail): AgentNetworkGuardrailAttributes => ({
	guardrailId: guardrail.id,
	name: guardrail.name,
	description: guardrail.description,
	modelAllowlist: {
		enabled: guardrail.checks.model_allowlist.enabled,
		models: guardrail.checks.model_allowlist.models,
	},
	promptCapture: {
		enabled: guardrail.checks.prompt_capture.enabled,
		redactPii: guardrail.checks.prompt_capture.redact_pii,
	},
});
