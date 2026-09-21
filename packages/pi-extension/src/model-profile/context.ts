/**
 * The context-budget axis: selecting the effective context window pi uses for
 * footer reporting, overflow handling, and auto-compaction.
 *
 * `contextWindow` is local pi metadata. Requests carry the unchanged model
 * id, so changing it never alters what the provider is asked for — it only
 * moves the threshold at which pi decides to compact.
 */

import { ENTRY_TYPE, STATUS_KEY, type State, baseStatus, formatTokens, modelKey, renderStatus } from "./state.ts";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

/** Resolves a profile name to its budget, or undefined when not configured. */
export function contextBudget(state: State, ctx: ExtensionContext, profile: string): number | undefined {
	const profiles = state.configFor(ctx.model)?.context;
	if (!profiles || !Object.hasOwn(profiles, profile)) return undefined;
	return profiles[profile];
}

/**
 * Applies a context profile to the active model.
 *
 * The `contextWindow` write is synchronous and happens before any await, so
 * a selection made while idle cannot interleave with a turn that starts
 * while this function is suspended.
 */
export function applyContextProfile(
	pi: ExtensionAPI,
	state: State,
	ctx: ExtensionContext,
	profile: string,
	options: { persist?: boolean } = {},
): boolean {
	const model = ctx.model;
	const budget = contextBudget(state, ctx, profile);
	if (!model || budget === undefined) {
		ctx.ui.notify(
			`No context profile "${profile}" configured for ${model ? modelKey(model) : "the current model"}.`,
			"warning",
		);
		return false;
	}

	const key = modelKey(model);
	const previous = model.contextWindow;
	model.contextWindow = budget;

	state.contextProfiles.set(key, profile);
	if (options.persist !== false) {
		pi.appendEntry(ENTRY_TYPE, { model: key, profile });
	}

	renderStatus(state, ctx);
	maybeCompact(state, ctx, previous);
	return true;
}

/**
 * Compacts when shrinking the window put the session over pi's auto-compaction
 * threshold. Without this the session would sit overflowed until the next
 * turn, which would then be rejected by the provider.
 */
function maybeCompact(state: State, ctx: ExtensionContext, previousWindow: number): void {
	const model = ctx.model;
	if (!model || model.contextWindow >= previousWindow) return;

	const usage = ctx.getContextUsage();
	// `tokens` is null right after a compaction, before the next response
	// gives pi a real number to work from; there is nothing to decide on yet.
	if (usage?.tokens == null) return;
	if (usage.tokens <= model.contextWindow - state.config.reserveTokens) return;

	// Only reachable when a context profile is configured, so `baseStatus`
	// always has something to report here.
	const revision = state.statusRevision;
	const status = baseStatus(state, model) ?? "";
	state.compactionStatus = { revision, status };
	ctx.ui.setStatus(STATUS_KEY, `${status} compacting`);

	// A compaction already running will bring the session under the new,
	// smaller threshold too, so starting a second one would just duplicate work.
	if (state.compactionInFlight) return;
	state.compactionInFlight = true;

	const finish = (error?: Error) => {
		state.compactionInFlight = false;
		const latest = state.compactionStatus;
		state.compactionStatus = undefined;
		// Stale callback: the profile changed again while this ran, so the
		// footer it would restore is no longer the current one.
		if (!latest || latest.revision !== state.statusRevision) return;
		ctx.ui.setStatus(STATUS_KEY, latest.status);
		if (error) ctx.ui.notify(`Context compaction failed: ${error.message}`, "error");
	};

	ctx.compact({ onComplete: () => finish(), onError: (error: Error) => finish(error) });
}

/**
 * Applies a profile now, or records it as pending when pi is streaming.
 *
 * Mutating `contextWindow` mid-turn would move the compaction threshold under
 * a request that is already in flight, so the change waits for `agent_settled`.
 */
export function requestContextProfile(pi: ExtensionAPI, state: State, ctx: ExtensionContext, profile: string): void {
	const model = ctx.model;
	const budget = contextBudget(state, ctx, profile);
	if (!model || budget === undefined) {
		ctx.ui.notify(
			`No context profile "${profile}" configured for ${model ? modelKey(model) : "the current model"}.`,
			"warning",
		);
		return;
	}

	if (!ctx.isIdle()) {
		state.pending = { ...state.pending, model: modelKey(model), context: profile };
		renderStatus(state, ctx, `→ ${formatTokens(budget)} pending`);
		return;
	}

	applyContextProfile(pi, state, ctx, profile);
}

/**
 * Picks the profile a model should start on: whatever is already active,
 * else whatever the branch recorded, else the configured default.
 */
export function resolveContextProfile(state: State, key: string, saved: string | undefined): string | undefined {
	const config = state.config.models[key];
	if (!config?.context) return undefined;
	return state.contextProfiles.get(key) ?? saved ?? config.defaultContext;
}

/** Cycles to the next profile, wrapping around. */
export function nextContextProfile(state: State, ctx: ExtensionContext): string | undefined {
	const model = ctx.model;
	const profiles = state.configFor(model)?.context;
	if (!model || !profiles) return undefined;

	const names = Object.keys(profiles);
	const key = modelKey(model);
	const pending = state.pending?.model === key ? state.pending.context : undefined;
	// Fall back to matching the live window so a profile applied before a
	// reload still cycles from the right place.
	const inferred = names.find(name => profiles[name] === model.contextWindow);
	const current = pending ?? state.contextProfiles.get(key) ?? inferred ?? state.config.models[key]?.defaultContext;

	const index = current ? names.indexOf(current) : -1;
	return names[(Math.max(0, index) + 1) % names.length];
}
