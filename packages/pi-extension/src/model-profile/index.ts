/**
 * model-profile — per-model context budgets and fast-mode alternatives.
 *
 * Two independent axes over the active model:
 *
 * - `/context` selects the effective context window, which pi uses for
 *   footer reporting, overflow handling, and the auto-compaction threshold.
 *   This is local metadata; the provider still receives the unchanged model id.
 * - `/fast` swaps in a cheaper, quicker model (and optionally a lower
 *   thinking level) for the next stretch of work, and back again.
 *
 * They are kept orthogonal on purpose: toggling fast mode preserves the
 * context profile of each model, and changing the budget never alters routing.
 *
 * Configuration lives in `${agentDir}/model-profile.json`, with trusted
 * projects able to layer `${cwd}/.pi/model-profile.json` over it. See
 * `config.ts` for the schema.
 */

import { CONFIG_DIR_NAME, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { type LoadResult, loadGlobalConfig, loadProjectConfig } from "./config.ts";
import { applyContextProfile, nextContextProfile, requestContextProfile, resolveContextProfile } from "./context.ts";
import { applyFastMode, requestFastMode, resolveFastTarget } from "./fast.ts";
import { State, STATUS_KEY, formatTokens, modelKey, renderStatus, savedContextProfile } from "./state.ts";

export default function modelProfileExtension(pi: ExtensionAPI): void {
	// Loaded eagerly: the shortcut bindings must be known before the
	// registration calls at the bottom of this function.
	const global: LoadResult = loadGlobalConfig();
	const state = new State(global.config);

	/**
	 * Restores both axes for the active model. Context comes from the branch
	 * so `/tree` and `/resume` land on what that branch was using; fast mode
	 * is deliberately not restored, since it is a transient "be cheap now"
	 * switch rather than a durable preference.
	 */
	function restore(ctx: ExtensionContext): void {
		const model = ctx.model;
		if (!model) {
			renderStatus(state, ctx);
			return;
		}

		const key = modelKey(model);
		const profiles = state.config.models[key]?.context;
		const saved = profiles ? savedContextProfile(ctx.sessionManager.getBranch(), key, profiles) : undefined;
		const profile = resolveContextProfile(state, key, saved);

		if (profile) {
			// Not persisted: restoring is derived from config and history, so
			// re-recording it would append an entry on every session start.
			applyContextProfile(pi, state, ctx, profile, { persist: false });
		} else {
			renderStatus(state, ctx);
		}
	}

	/** Drains queued changes once the agent settles. */
	async function applyPending(ctx: ExtensionContext): Promise<void> {
		if (state.applying || !ctx.isIdle()) return;

		state.applying = true;
		try {
			while (state.pending && ctx.isIdle()) {
				const pending = state.pending;
				state.pending = undefined;

				// The model moved on while the turn ran, so a profile chosen
				// for the old one no longer applies.
				if (!ctx.model || modelKey(ctx.model) !== pending.model) continue;

				if (pending.context) applyContextProfile(pi, state, ctx, pending.context);
				if (pending.fast !== undefined) await applyFastMode(pi, state, ctx, pending.fast);
			}
		} finally {
			state.applying = false;
		}
	}

	pi.on("session_start", async (_event, ctx) => {
		state.reset();
		state.config = global.config;

		let error = global.error;
		// Project config is dynamic, untrusted input; only read it once pi has
		// resolved trust for this directory.
		if (ctx.isProjectTrusted()) {
			const project = loadProjectConfig(global, ctx.cwd, CONFIG_DIR_NAME);
			state.config = project.config;
			error = project.error;
		}
		if (error) ctx.ui.notify(`model-profile config error: ${error}`, "error");

		restore(ctx);

		// Surface a misconfigured fast target at startup rather than at the
		// moment the user reaches for it.
		const fast = resolveFastTarget(state, ctx);
		if (fast && !fast.model) {
			const provider = fast.config.provider ?? ctx.model?.provider;
			ctx.ui.notify(`model-profile: fast model ${provider}/${fast.config.model} is not available.`, "warning");
		}

		if (pi.getFlag("fast") === true) await requestFastMode(pi, state, ctx, true);
	});

	pi.on("session_tree", async (_event, ctx) => {
		// Branch state is authoritative after navigation, so drop anything
		// queued against the branch being left.
		state.pending = undefined;
		state.contextProfiles.clear();
		restore(ctx);
	});

	pi.on("model_select", async (_event, ctx) => {
		// Our own setModel call; enableFast/disableFast own the state here and
		// will re-apply context and status once the switch completes.
		if (state.switching) return;

		// A user-driven model change means any fast-mode restore target is
		// stale: exiting fast mode would otherwise yank them back to a model
		// they deliberately navigated away from.
		state.fastPrimary = undefined;
		state.pending = undefined;
		restore(ctx);
	});

	pi.on("agent_settled", async (_event, ctx) => {
		await applyPending(ctx);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		state.reset();
		ctx.ui.setStatus(STATUS_KEY, undefined);
	});

	pi.registerFlag("fast", {
		description: "Start the session in fast mode",
		type: "boolean",
		default: false,
	});

	pi.registerShortcut(state.config.shortcuts.context, {
		description: "Cycle the current model's context budget",
		handler: async ctx => {
			const next = nextContextProfile(state, ctx);
			if (!next) {
				ctx.ui.notify(
					`No context profiles configured for ${ctx.model ? modelKey(ctx.model) : "the current model"}.`,
					"warning",
				);
				return;
			}
			requestContextProfile(pi, state, ctx, next);
		},
	});

	pi.registerShortcut(state.config.shortcuts.fast, {
		description: "Toggle fast mode",
		handler: async ctx => {
			await requestFastMode(pi, state, ctx, !state.fastActive);
		},
	});

	pi.registerCommand("context", {
		description: "Select the active model's context-window budget",
		getArgumentCompletions(prefix: string) {
			const names = new Set<string>(["status"]);
			for (const model of Object.values(state.config.models)) {
				for (const name of Object.keys(model.context ?? {})) names.add(name);
			}
			const matches = [...names].filter(name => name.startsWith(prefix.trim().toLowerCase()));
			return matches.length > 0 ? matches.map(value => ({ value, label: value })) : null;
		},
		handler: async (args, ctx) => {
			const action = args.trim().toLowerCase();
			const model = ctx.model;
			const profiles = state.configFor(model)?.context;

			if (action === "status") {
				const key = model ? modelKey(model) : "the current model";
				if (!model || !profiles) {
					ctx.ui.notify(`No context profiles configured for ${key}.`, "warning");
					return;
				}
				const active = state.contextProfiles.get(modelKey(model)) ?? "unresolved";
				const pending =
					state.pending?.model === modelKey(model) && state.pending.context
						? ` (${state.pending.context} pending)`
						: "";
				ctx.ui.notify(
					`Context budget for ${key}: ${active}${pending}; ${formatTokens(model.contextWindow)} effective.`,
					"info",
				);
				return;
			}

			if (action) {
				requestContextProfile(pi, state, ctx, action);
				return;
			}

			if (!model || !profiles) {
				ctx.ui.notify(
					`No context profiles configured for ${model ? modelKey(model) : "the current model"}.`,
					"warning",
				);
				return;
			}

			const names = Object.keys(profiles);
			const choices = names.map(name => `${name} — ${formatTokens(profiles[name]!)}`);
			const selected = await ctx.ui.select(`Context budget for ${modelKey(model)}`, choices);
			if (!selected) return;
			const index = choices.indexOf(selected);
			if (index < 0) return;
			requestContextProfile(pi, state, ctx, names[index]!);
		},
	});

	pi.registerCommand("fast", {
		description: "Toggle a faster, cheaper model for the current session",
		getArgumentCompletions(prefix: string) {
			const matches = ["on", "off", "status"].filter(value => value.startsWith(prefix.trim().toLowerCase()));
			return matches.length > 0 ? matches.map(value => ({ value, label: value })) : null;
		},
		handler: async (args, ctx) => {
			const action = args.trim().toLowerCase();

			if (action === "status") {
				const target = resolveFastTarget(state, ctx);
				if (state.fastActive) {
					ctx.ui.notify(
						`Fast mode is on: ${ctx.model ? modelKey(ctx.model) : "unknown"} (restores ${modelKey(state.fastPrimary!.model)}).`,
						"info",
					);
				} else if (target) {
					const provider = target.config.provider ?? ctx.model?.provider;
					ctx.ui.notify(`Fast mode is off; would switch to ${provider}/${target.config.model}.`, "info");
				} else {
					ctx.ui.notify(
						`No fast model configured for ${ctx.model ? modelKey(ctx.model) : "the current model"}.`,
						"warning",
					);
				}
				return;
			}

			if (action === "on" || action === "off") {
				await requestFastMode(pi, state, ctx, action === "on");
				return;
			}

			if (action) {
				ctx.ui.notify(`Unknown argument "${action}"; expected on, off, or status.`, "warning");
				return;
			}

			await requestFastMode(pi, state, ctx, !state.fastActive);
		},
	});
}
