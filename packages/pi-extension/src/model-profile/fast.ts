/**
 * The fast-mode axis: asking the provider for its faster, pricier path on the
 * same model.
 *
 * The switch is one session-wide flag. While it is on, every request to a
 * model configured with `fast: true` carries OpenAI's `service_tier:
 * "priority"`, which the gateway maps to each provider's own fast path (Codex
 * priority processing, Claude `speed: "fast"`). Routing never changes, so a
 * toggle takes effect from the next request, even mid-turn, and needs no
 * deferral.
 *
 * Pi does not price service tiers, so the finalized message's cost is scaled
 * here, by the model's `fastCostMultiplier`. Fast-mode failures are recognised by the code the gateway puts at the
 * start of the error message: pi keeps nothing else of a streamed error.
 */

import { type AnyModel, type State, modelKey, renderStatus } from "./state.ts";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

/**
 * How much more a fast request costs than a standard one, for a model whose
 * config does not say.
 *
 * Anthropic prices fast mode at 2x on every model that offers it, and so does
 * OpenAI on GPT-5.6 and GPT-6; GPT-5.5 is 2.5x, which its config states. Codex
 * subscriptions burn their included limits at their own rates, but that is
 * plan usage, not dollars: the cost pi shows is the API-equivalent price.
 */
export const DEFAULT_FAST_COST_MULTIPLIER = 2;

/** Error codes the gateway prefixes fast-mode failures with. */
const UNSUPPORTED = "fast_mode_unsupported";
const CREDITS_REQUIRED = "fast_mode_credits_required";
const RATE_LIMITED = "fast_mode_rate_limited";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describe(model: AnyModel | undefined): string {
	return model ? modelKey(model) : "the current model";
}

/**
 * Turns fast mode on or off for the session. Returns whether the switch ended
 * up in the requested position.
 *
 * Enabling is refused on a model that cannot use it, since the switch would
 * otherwise sit on without changing anything. Once on, it stays on across
 * model changes and applies wherever the active model offers it.
 */
export function setFastMode(state: State, ctx: ExtensionContext, enabled: boolean): boolean {
	if (enabled === state.fastEnabled) return true;

	if (enabled) {
		const model = ctx.model;
		if (!state.configFor(model)?.fast) {
			ctx.ui.notify(`No fast mode configured for ${describe(model)}.`, "warning");
			return false;
		}
		if (!state.fastCapable(model)) {
			ctx.ui.notify(`${describe(model)} uses the ${model?.api} API, which cannot request fast mode.`, "warning");
			return false;
		}
	}

	state.fastEnabled = enabled;
	renderStatus(state, ctx);
	return true;
}

/**
 * The provider payload with the fast path requested, or `undefined` to leave
 * it unchanged. Also records whether this request went out fast, which
 * {@link settleFastResponse} reads once the response is finalized.
 *
 * The hook carries no model, so the payload's own `model` is matched against
 * the active model: a request built for anything else is left alone.
 */
export function withFastPath(state: State, ctx: ExtensionContext, payload: unknown): unknown {
	state.fastRequest = undefined;

	const model = ctx.model;
	if (!state.fastApplies(model) || !isRecord(payload) || payload.model !== model!.id) return undefined;

	state.fastRequest = modelKey(model!);
	return { ...payload, service_tier: "priority" };
}

/**
 * Settles one finalized message: scales the cost of a response that was sent
 * fast, and reacts to fast-mode failures. Returns the replacement message, or
 * `undefined` to keep it.
 */
export function settleFastResponse(state: State, ctx: ExtensionContext, message: unknown): unknown {
	if (!isRecord(message) || message.role !== "assistant") return undefined;

	const key = `${String(message.provider)}/${String(message.model)}`;
	const sentFast = state.fastRequest === key;
	if (sentFast) state.fastRequest = undefined;

	if (message.stopReason === "error") {
		handleFastError(state, ctx, typeof message.errorMessage === "string" ? message.errorMessage : "");
		return undefined;
	}

	// Aborted responses are billed for what they produced, so they are scaled
	// like completed ones.
	if (!sentFast || !isRecord(message.usage) || !isRecord(message.usage.cost)) return undefined;

	const multiplier = state.config.models[key]?.fastCostMultiplier ?? DEFAULT_FAST_COST_MULTIPLIER;
	const cost = message.usage.cost as Record<string, number>;
	const scaled = Object.fromEntries(
		Object.entries(cost).map(([name, value]) => [name, typeof value === "number" ? value * multiplier : value]),
	);
	return { ...message, usage: { ...message.usage, cost: scaled } };
}

/**
 * Turns fast mode off when the gateway says it cannot be had, rather than
 * letting every later request fail the same way. A rate limit is transient:
 * pi retries it on its own, so the switch stays on.
 */
function handleFastError(state: State, ctx: ExtensionContext, error: string): void {
	if (error.includes(UNSUPPORTED) || error.includes(CREDITS_REQUIRED)) {
		const reason = error.includes(UNSUPPORTED)
			? `${describe(ctx.model)} does not offer it`
			: "the account has no fast-mode credits";
		if (state.fastEnabled) {
			state.fastEnabled = false;
			renderStatus(state, ctx);
		}
		ctx.ui.notify(`Fast mode turned off: ${reason}.`, "error");
		return;
	}

	if (error.includes(RATE_LIMITED) && state.fastEnabled) {
		ctx.ui.notify("Fast mode is rate limited. Pi will retry; /fast off continues at standard speed.", "warning");
	}
}
