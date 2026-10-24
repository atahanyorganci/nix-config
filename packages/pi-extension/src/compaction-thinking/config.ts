/**
 * Configuration for the compaction-thinking extension.
 *
 * Read from `${agentDir}/compaction-thinking.json` only. A project-local file
 * is deliberately not honoured: this decides how much a summary costs, and an
 * untrusted checkout has no business turning that up.
 *
 * ```json
 * {
 *   "models": {
 *     "llm-gateway/claude-code/claude-opus-5-5": { "max": "high" }
 *   }
 * }
 * ```
 *
 * Each model maps the session's thinking level to the one compaction should
 * summarize at. Levels without an entry keep the session's level.
 */

import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ModelThinkingLevel } from "@earendil-works/pi-ai";

export const CONFIG_FILE_NAME = "compaction-thinking.json";

export const THINKING_LEVELS: readonly ModelThinkingLevel[] = [
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
];

/** Session thinking level to the level compaction uses instead. */
export type LevelMap = Partial<Record<ModelThinkingLevel, ModelThinkingLevel>>;

export interface Config {
	/** Level maps keyed by `"provider/modelId"`. */
	models: Record<string, LevelMap>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isThinkingLevel(value: unknown): value is ModelThinkingLevel {
	return typeof value === "string" && (THINKING_LEVELS as readonly string[]).includes(value);
}

function parseLevelMap(key: string, raw: unknown): LevelMap {
	if (!isRecord(raw)) throw new Error(`model "${key}" must be an object`);

	const map: LevelMap = {};
	for (const [from, to] of Object.entries(raw)) {
		if (!isThinkingLevel(from)) {
			throw new Error(`model "${key}": "${from}" is not a thinking level (${THINKING_LEVELS.join(", ")})`);
		}
		if (!isThinkingLevel(to)) {
			throw new Error(`model "${key}": "${from}" must map to one of ${THINKING_LEVELS.join(", ")}`);
		}
		map[from] = to;
	}
	return map;
}

export function parseConfig(input: unknown): Config {
	if (!isRecord(input)) throw new Error("configuration must be a JSON object");

	const models: Record<string, LevelMap> = {};
	if (input.models !== undefined) {
		if (!isRecord(input.models)) throw new Error('"models" must be an object');
		for (const [key, raw] of Object.entries(input.models)) {
			models[key] = parseLevelMap(key, raw);
		}
	}
	return { models };
}

export interface LoadResult {
	config: Config;
	error?: string | undefined;
}

export function loadConfig(path: string = join(getAgentDir(), CONFIG_FILE_NAME)): LoadResult {
	const empty: Config = { models: {} };
	if (!existsSync(path)) return { config: empty };

	try {
		return { config: parseConfig(JSON.parse(readFileSync(path, "utf8"))) };
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : String(cause);
		return { config: empty, error: `${path}: ${message}` };
	}
}

/**
 * The level compaction should summarize at, or `undefined` to leave pi's
 * default compaction alone.
 */
export function compactionLevel(
	config: Config,
	modelKey: string,
	sessionLevel: ModelThinkingLevel,
): ModelThinkingLevel | undefined {
	const target = config.models[modelKey]?.[sessionLevel];
	return target === undefined || target === sessionLevel ? undefined : target;
}
