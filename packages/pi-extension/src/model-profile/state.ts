/**
 * Shared mutable state, session persistence, and footer rendering.
 *
 * The two axes have deliberately different lifetimes:
 *
 * - Context budgets are per model key and persisted as custom session
 *   entries, which are branch-aware and excluded from LLM context. They are
 *   a durable preference: "this model should compact at 272k".
 * - Fast mode is session-transient and global, because only one model is
 *   active at a time. It is an explicit "do this next bit cheaply" switch,
 *   so restoring it on resume would silently route work to the cheap model
 *   long after the reason for enabling it had passed.
 */

import type { Config, ModelProfileConfig, ThinkingLevel } from "./config.ts";
import type { Api, Model } from "@earendil-works/pi-ai";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

export const ENTRY_TYPE = "model-profile-context";
export const STATUS_KEY = "model-profile";

export type AnyModel = Model<Api> | Model<any>;

/** The model fast mode displaced, and the level to put back on exit. */
export interface PrimaryState {
	model: AnyModel;
	thinkingLevel: ThinkingLevel | undefined;
}

/** A change that could not be applied because pi was streaming. */
export interface Pending {
	/** Target model key; a context change is dropped if the model moved on. */
	model: string;
	context?: string | undefined;
	fast?: boolean | undefined;
}

export interface PersistedContext {
	model: string;
	profile: string;
}

export function modelKey(model: AnyModel): string {
	return `${model.provider}/${model.id}`;
}

/** `272000` renders as `272k`, `1050000` as `1.05m`. */
export function formatTokens(tokens: number): string {
	if (tokens >= 1_000_000) return `${Number((tokens / 1_000_000).toFixed(2))}m`;
	return `${Math.round(tokens / 1_000)}k`;
}

export class State {
	config: Config;
	/** Active context profile per model key. */
	readonly contextProfiles = new Map<string, string>();
	/** Set while fast mode is active; holds what to restore on exit. */
	fastPrimary: PrimaryState | undefined;
	pending: Pending | undefined;
	/**
	 * Set while `pi.setModel()` is in flight so the `model_select` handler it
	 * triggers can tell an extension-driven switch from a user-driven one.
	 */
	switching = false;
	/** Guards the `agent_settled` drain against re-entering itself. */
	applying = false;
	/**
	 * Incremented on every status change. A compaction callback compares it
	 * against the value captured at request time and stays silent if a newer
	 * change has since landed, so a slow compaction cannot overwrite a
	 * footer that has already moved on.
	 */
	statusRevision = 0;
	compactionInFlight = false;
	compactionStatus: { revision: number; status: string } | undefined;

	constructor(config: Config) {
		this.config = config;
	}

	configFor(model: AnyModel | undefined): ModelProfileConfig | undefined {
		return model ? this.config.models[modelKey(model)] : undefined;
	}

	get fastActive(): boolean {
		return this.fastPrimary !== undefined;
	}

	/** Clears per-session state, keeping the loaded configuration. */
	reset(): void {
		this.contextProfiles.clear();
		this.fastPrimary = undefined;
		this.pending = undefined;
		this.switching = false;
		this.applying = false;
		this.statusRevision++;
		this.compactionStatus = undefined;
		this.compactionInFlight = false;
	}
}

/**
 * Finds the newest context profile persisted for a model on the current
 * branch. Walking backwards means the most recent entry wins; reading the
 * branch rather than every entry keeps `/tree` navigation correct.
 */
export function savedContextProfile(
	entries: readonly unknown[],
	key: string,
	profiles: Record<string, number>,
): string | undefined {
	for (let index = entries.length - 1; index >= 0; index--) {
		const entry = entries[index] as {
			type?: string;
			customType?: string;
			data?: Partial<PersistedContext>;
		};
		if (
			entry.type === "custom" &&
			entry.customType === ENTRY_TYPE &&
			entry.data?.model === key &&
			typeof entry.data.profile === "string" &&
			// A profile removed from the config since it was written must not
			// resurrect itself from session history.
			Object.hasOwn(profiles, entry.data.profile)
		) {
			return entry.data.profile;
		}
	}
	return undefined;
}

/**
 * The status text without any transient suffix, or undefined when neither
 * axis has anything to report.
 *
 * The budget is shown only when the model actually has profiles to switch
 * between: pi's own footer already reports context usage, so repeating a
 * fixed window here would just imply a control that does not exist.
 */
export function baseStatus(state: State, model: AnyModel): string | undefined {
	const parts: string[] = [];
	if (state.configFor(model)?.context) parts.push(`ctx:${formatTokens(model.contextWindow)}`);
	if (state.fastActive) parts.push("⚡");
	return parts.length > 0 ? parts.join(" ") : undefined;
}

/**
 * Renders the footer for the active model: the selected context window, a
 * lightning bolt in fast mode, and an optional transient suffix used while
 * compacting or while a change waits for the agent to settle.
 */
export function renderStatus(state: State, ctx: ExtensionContext, suffix?: string): void {
	state.statusRevision++;
	state.compactionStatus = undefined;

	const status = ctx.model ? baseStatus(state, ctx.model) : undefined;
	if (!status) {
		// A suffix still matters with no status of its own: a pending change on
		// an otherwise unreported model would vanish silently otherwise.
		ctx.ui.setStatus(STATUS_KEY, suffix);
		return;
	}

	ctx.ui.setStatus(STATUS_KEY, suffix ? `${status} ${suffix}` : status);
}
