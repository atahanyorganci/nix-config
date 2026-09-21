/**
 * The fast-mode axis: swapping the active model for a cheaper, quicker
 * alternative and back.
 *
 * Unlike the context axis this changes real routing, so it is applied only
 * while idle and always through `pi.setModel()`, which reports whether the
 * target provider is actually authenticated.
 */

import { type State, modelKey, renderStatus } from "./state.ts";
import type { FastModeConfig } from "./config.ts";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

/** Resolves the configured fast target for the active model. */
export function resolveFastTarget(
	state: State,
	ctx: ExtensionContext,
): { config: FastModeConfig; model: ReturnType<ExtensionContext["modelRegistry"]["find"]> } | undefined {
	const model = ctx.model;
	const config = state.configFor(model)?.fast;
	if (!model || !config) return undefined;

	// An unqualified target means "same provider", which keeps same-gateway
	// pairs terse and avoids repeating the provider on every entry.
	const provider = config.provider ?? model.provider;
	return { config, model: ctx.modelRegistry.find(provider, config.model) };
}

/**
 * Enables or disables fast mode.
 *
 * `pi.setModel()` emits `model_select`, whose handler restores the incoming
 * model's context profile. `state.switching` marks those emissions as
 * self-inflicted so the handler does not treat them as a user model change
 * and clobber the state being set up here.
 */
export async function applyFastMode(
	pi: ExtensionAPI,
	state: State,
	ctx: ExtensionContext,
	enabled: boolean,
): Promise<boolean> {
	if (enabled === state.fastActive) return true;

	return enabled ? await enableFast(pi, state, ctx) : await disableFast(pi, state, ctx);
}

async function enableFast(pi: ExtensionAPI, state: State, ctx: ExtensionContext): Promise<boolean> {
	const model = ctx.model;
	const target = resolveFastTarget(state, ctx);
	if (!model || !target) {
		ctx.ui.notify(`No fast model configured for ${model ? modelKey(model) : "the current model"}.`, "warning");
		return false;
	}

	const config = target.config;
	if (!target.model) {
		const provider = config.provider ?? model.provider;
		ctx.ui.notify(`Fast model ${provider}/${config.model} is not available.`, "error");
		return false;
	}

	// Capture before switching: once setModel lands, ctx.model is the target
	// and the original is unrecoverable.
	const primary = { model, thinkingLevel: ctx.thinkingLevel };

	state.switching = true;
	try {
		if (!(await pi.setModel(target.model))) {
			ctx.ui.notify(
				`Cannot switch to ${modelKey(target.model)}: no credentials for provider "${target.model.provider}".`,
				"error",
			);
			return false;
		}
	} finally {
		state.switching = false;
	}

	// Only commit once the switch actually succeeded, so a failed setModel
	// leaves fast mode off rather than half-applied.
	state.fastPrimary = primary;
	if (config.thinkingLevel) pi.setThinkingLevel(config.thinkingLevel);

	// The fast model may carry its own context profile.
	applyContextForCurrentModel(state, ctx);
	renderStatus(state, ctx);
	return true;
}

async function disableFast(pi: ExtensionAPI, state: State, ctx: ExtensionContext): Promise<boolean> {
	const primary = state.fastPrimary;
	if (!primary) return true;

	state.switching = true;
	try {
		if (!(await pi.setModel(primary.model))) {
			ctx.ui.notify(
				`Cannot restore ${modelKey(primary.model)}: no credentials for provider "${primary.model.provider}".`,
				"error",
			);
			return false;
		}
	} finally {
		state.switching = false;
	}

	state.fastPrimary = undefined;
	if (primary.thinkingLevel) pi.setThinkingLevel(primary.thinkingLevel);

	applyContextForCurrentModel(state, ctx);
	renderStatus(state, ctx);
	return true;
}

/**
 * Re-applies the context profile belonging to whatever model is now active,
 * without persisting: the model switch is the event worth recording, and the
 * profile it implies is derived from config rather than chosen by the user.
 */
function applyContextForCurrentModel(state: State, ctx: ExtensionContext): void {
	const model = ctx.model;
	const config = state.configFor(model);
	if (!model || !config?.context) return;

	const key = modelKey(model);
	const profile = state.contextProfiles.get(key) ?? config.defaultContext;
	if (!profile) return;

	const budget = config.context[profile];
	if (budget === undefined) return;

	model.contextWindow = budget;
	state.contextProfiles.set(key, profile);
}

/**
 * Toggles now, or records the request as pending when pi is streaming.
 * Switching models mid-turn would change routing for a request already in
 * flight, so this always waits for `agent_settled`.
 */
export async function requestFastMode(
	pi: ExtensionAPI,
	state: State,
	ctx: ExtensionContext,
	enabled: boolean,
): Promise<void> {
	const model = ctx.model;
	if (!model) return;

	// Disabling must stay available even when the current (fast) model has no
	// fast config of its own — otherwise fast mode could not be turned off.
	if (enabled && !state.configFor(model)?.fast) {
		ctx.ui.notify(`No fast model configured for ${modelKey(model)}.`, "warning");
		return;
	}

	if (!ctx.isIdle()) {
		state.pending = { ...state.pending, model: modelKey(model), fast: enabled };
		renderStatus(state, ctx, enabled ? "→ fast pending" : "→ normal pending");
		return;
	}

	await applyFastMode(pi, state, ctx, enabled);
}
