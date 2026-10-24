/**
 * compaction-thinking — summarize at a different thinking level than the session.
 *
 * Pi's built-in compaction reuses the session's thinking level. Some models
 * cannot fit a summary under that level: the output budget compaction allows
 * is a fraction of `compaction.reserveTokens`, and a high-effort reasoning
 * pass can spend it before writing the summary. This extension remaps the
 * level for compaction alone, per model and per session level, and leaves
 * the session's own level untouched.
 *
 * It runs pi's own `compact()` with the remapped level, so the summary
 * prompt, split-turn handling and file tracking match the default exactly.
 * Models and levels without an entry are left to pi.
 *
 * Configuration lives in `${agentDir}/compaction-thinking.json`; see
 * `config.ts` for the schema.
 */

import { clampThinkingLevel, type RetryPolicy } from "@earendil-works/pi-ai";
import {
	compact,
	getLatestCompactionEntry,
	getAgentDir,
	SettingsManager,
	type ExtensionAPI,
	type ExtensionContext,
	type SessionBeforeCompactEvent,
	type SessionEntry,
} from "@earendil-works/pi-coding-agent";
import { compactionLevel, loadConfig } from "./config.ts";

/** Not re-exported by pi, so taken from the event that carries it. */
export type CompactionPreparation = SessionBeforeCompactEvent["preparation"];

/**
 * The stream function `compact()` accepts. Taken from its signature rather
 * than imported: it is declared against pi-agent-core's copy of pi-ai, which
 * need not be the copy this package resolves.
 */
type CompactStreamFn = NonNullable<Parameters<typeof compact>[7]>;

/**
 * Carries file lists over from a previous compaction this extension wrote.
 *
 * Pi only seeds `preparation.fileOps` from compactions it generated itself;
 * anything an extension returns is stored with `fromHook: true` and skipped.
 * Without this, every compaction after one of ours would forget the files
 * read and modified before it.
 */
export function inheritFileOps(preparation: CompactionPreparation, branchEntries: SessionEntry[]): void {
	const previous = getLatestCompactionEntry(branchEntries);
	if (!previous?.fromHook) return;

	const details = previous.details as { readFiles?: unknown; modifiedFiles?: unknown } | undefined;
	if (Array.isArray(details?.readFiles)) {
		for (const file of details.readFiles) if (typeof file === "string") preparation.fileOps.read.add(file);
	}
	if (Array.isArray(details?.modifiedFiles)) {
		for (const file of details.modifiedFiles) if (typeof file === "string") preparation.fileOps.edited.add(file);
	}
}

/** Pi's retry policy, so a dropped stream is retried the way the default compaction would. */
function retryPolicy(ctx: ExtensionContext): RetryPolicy | undefined {
	try {
		return SettingsManager.create(ctx.cwd, getAgentDir(), {
			projectTrusted: ctx.isProjectTrusted(),
		}).getRetrySettings();
	} catch {
		return undefined;
	}
}

export default function compactionThinkingExtension(pi: ExtensionAPI): void {
	const { config, error } = loadConfig();

	pi.on("session_start", (_event, ctx) => {
		if (error && ctx.hasUI) ctx.ui.notify(`compaction-thinking: ${error}`, "error");
	});

	pi.on("session_before_compact", async (event, ctx) => {
		const model = ctx.model;
		if (!model?.reasoning) return;

		const sessionLevel = pi.getThinkingLevel();
		const target = compactionLevel(config, `${model.provider}/${model.id}`, sessionLevel);
		if (!target) return;

		// The map names levels, not what the model offers; land on the
		// nearest one it supports, as pi does for the session level.
		const level = clampThinkingLevel(model, target);
		const { preparation, branchEntries, customInstructions, signal } = event;
		inheritFileOps(preparation, branchEntries);

		// The registry resolves auth per request and routes virtual models.
		// The cast only bridges the two declarations of the same stream class.
		const streamFn: CompactStreamFn = (requestModel, context, options) =>
			ctx.modelRegistry.streamSimple(requestModel, context, options) as unknown as Awaited<ReturnType<CompactStreamFn>>;

		try {
			const compaction = await compact(
				preparation,
				model,
				undefined,
				undefined,
				customInstructions,
				signal,
				level,
				streamFn,
				undefined,
				retryPolicy(ctx),
			);
			return { compaction };
		} catch (cause) {
			if (signal.aborted) return { cancel: true };

			// Falling back would rerun the summary at the level this mapping
			// exists to avoid, so surface the failure and skip this round
			// instead. Pi tries again at the next threshold.
			const message = cause instanceof Error ? cause.message : String(cause);
			if (ctx.hasUI) ctx.ui.notify(`Compaction at ${level} thinking failed: ${message}`, "error");
			return { cancel: true };
		}
	});
}
