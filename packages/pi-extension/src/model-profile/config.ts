/**
 * Configuration loading and validation for the model-profile extension.
 *
 * Two files are merged, global first: `${agentDir}/model-profile.json` and,
 * only for trusted projects, `${cwd}/${CONFIG_DIR_NAME}/model-profile.json`.
 * Shortcuts are read from the global file alone — pi registers shortcuts
 * before it resolves project trust, so honouring a project-local binding
 * would let an untrusted checkout claim a keybinding.
 */

import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { KeyId } from "@earendil-works/pi-tui";

export const CONFIG_FILE_NAME = "model-profile.json";

/**
 * Mirrors `ThinkingLevel` from `@earendil-works/pi-agent-core`, which the
 * extension API uses but neither pi-coding-agent nor pi-ai re-exports. Note
 * pi-ai declares a same-named type that omits `"off"`; this is the other one.
 */
export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

const THINKING_LEVELS: readonly ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

/** Pi's own fallback when `compaction.reserveTokens` is unset. */
export const FALLBACK_RESERVE_TOKENS = 16_384;

/**
 * Profile names that would collide with a subcommand of `/context` or
 * `/fast`, making the argument ambiguous.
 */
const RESERVED_PROFILE_NAMES = new Set(["status", "on", "off", "toggle"]);

const PROFILE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export interface FastModeConfig {
	/** Defaults to the primary model's provider. */
	provider?: string | undefined;
	model: string;
	/** Left at the primary's level when unset. */
	thinkingLevel?: ThinkingLevel | undefined;
}

export interface ModelProfileConfig {
	/** Name of the context profile new sessions start on. */
	defaultContext?: string | undefined;
	/** Context-window budgets in tokens, keyed by profile name. */
	context?: Record<string, number> | undefined;
	fast?: FastModeConfig | undefined;
}

export interface Shortcuts {
	context: KeyId;
	fast: KeyId;
}

export interface Config {
	/**
	 * Tokens auto-compaction reserves for the response. Read from pi's own
	 * settings so a shrink triggers compaction on exactly the boundary pi
	 * uses, rather than a second hardcoded copy of the default.
	 */
	reserveTokens: number;
	shortcuts: Shortcuts;
	models: Record<string, ModelProfileConfig>;
}

export const DEFAULT_SHORTCUTS: Shortcuts = {
	context: "alt+shift+c",
	fast: "alt+shift+f",
};

const SPECIAL_KEYS = new Set([
	"escape",
	"esc",
	"enter",
	"return",
	"tab",
	"space",
	"backspace",
	"delete",
	"insert",
	"clear",
	"home",
	"end",
	"pageUp",
	"pageDown",
	"up",
	"down",
	"left",
	"right",
	...Array.from({ length: 12 }, (_, index) => `f${index + 1}`),
]);

const SYMBOL_KEYS = new Set("`-=\\[];',./!@#$%^&*()_+|~{}:<>?".split(""));

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates a pi key identifier: any number of distinct modifiers followed by
 * a single alphanumeric, named, or symbol key.
 */
function isKeyId(value: string): value is KeyId {
	let remainder = value;
	const modifiers = new Set<string>();

	while (true) {
		const match = /^(ctrl|shift|alt|super)\+/.exec(remainder);
		if (!match) break;
		const modifier = match[1]!;
		if (modifiers.has(modifier)) return false;
		modifiers.add(modifier);
		remainder = remainder.slice(match[0].length);
	}

	return /^[a-z0-9]$/.test(remainder) || SPECIAL_KEYS.has(remainder) || SYMBOL_KEYS.has(remainder);
}

/**
 * Reads `compaction.reserveTokens` from pi's settings. Any failure falls back
 * to pi's default: this is an optimisation for the compaction boundary, not
 * something worth failing the extension over.
 */
export function readReserveTokens(): number {
	try {
		// Pi computes this as `join(getAgentDir(), "settings.json")` but does
		// not re-export `getSettingsPath`, so rebuild it from the public helper.
		const path = join(getAgentDir(), "settings.json");
		if (!existsSync(path)) return FALLBACK_RESERVE_TOKENS;
		const settings: unknown = JSON.parse(readFileSync(path, "utf8"));
		if (!isRecord(settings) || !isRecord(settings.compaction)) return FALLBACK_RESERVE_TOKENS;
		const reserve = settings.compaction.reserveTokens;
		return typeof reserve === "number" && Number.isInteger(reserve) && reserve >= 0 ? reserve : FALLBACK_RESERVE_TOKENS;
	} catch {
		return FALLBACK_RESERVE_TOKENS;
	}
}

function parseContextProfiles(key: string, raw: unknown, reserveTokens: number): Record<string, number> {
	if (!isRecord(raw)) throw new Error(`model "${key}": "context" must be an object`);

	const profiles: Record<string, number> = {};
	for (const [name, budget] of Object.entries(raw)) {
		if (!PROFILE_NAME_PATTERN.test(name) || RESERVED_PROFILE_NAMES.has(name)) {
			throw new Error(
				`context profile "${key}/${name}" must match ${PROFILE_NAME_PATTERN.source} and must not be one of ${[...RESERVED_PROFILE_NAMES].join(", ")}`,
			);
		}
		if (typeof budget !== "number" || !Number.isInteger(budget) || budget <= reserveTokens) {
			throw new Error(`context profile "${key}/${name}" must be an integer greater than ${reserveTokens}`);
		}
		profiles[name] = budget;
	}

	// A single profile has nothing to switch to, which is almost always a
	// typo rather than an intentional no-op.
	if (Object.keys(profiles).length < 2) {
		throw new Error(`model "${key}" must define at least two context profiles`);
	}

	return profiles;
}

function parseFastMode(key: string, raw: unknown): FastModeConfig {
	if (!isRecord(raw)) throw new Error(`model "${key}": "fast" must be an object`);

	const model = typeof raw.model === "string" ? raw.model.trim() : "";
	if (!model) throw new Error(`model "${key}": "fast.model" must be a non-empty string`);

	const provider = raw.provider === undefined ? undefined : raw.provider;
	if (provider !== undefined && (typeof provider !== "string" || !provider.trim())) {
		throw new Error(`model "${key}": "fast.provider" must be a non-empty string when set`);
	}

	const level = raw.thinkingLevel;
	if (level !== undefined && !THINKING_LEVELS.includes(level as ThinkingLevel)) {
		throw new Error(`model "${key}": "fast.thinkingLevel" must be one of ${THINKING_LEVELS.join(", ")}`);
	}

	return {
		model,
		provider: typeof provider === "string" ? provider.trim() : undefined,
		thinkingLevel: level as ThinkingLevel | undefined,
	};
}

function parseModel(key: string, raw: unknown, reserveTokens: number): ModelProfileConfig {
	if (!isRecord(raw)) throw new Error(`model "${key}" must be an object`);

	const context = raw.context === undefined ? undefined : parseContextProfiles(key, raw.context, reserveTokens);
	const fast = raw.fast === undefined ? undefined : parseFastMode(key, raw.fast);

	if (!context && !fast) {
		throw new Error(`model "${key}" must define "context", "fast", or both`);
	}

	let defaultContext: string | undefined;
	if (raw.defaultContext !== undefined) {
		if (typeof raw.defaultContext !== "string") {
			throw new Error(`model "${key}": "defaultContext" must be a string`);
		}
		if (!context || !Object.hasOwn(context, raw.defaultContext)) {
			throw new Error(`model "${key}": default context profile "${raw.defaultContext}" is not defined`);
		}
		defaultContext = raw.defaultContext;
	} else if (context) {
		defaultContext = Object.keys(context)[0]!;
	}

	return { defaultContext, context, fast };
}

/**
 * Layers one parsed config file over a base. Models are replaced wholesale
 * rather than deep-merged: a half-overridden profile set whose
 * `defaultContext` points into the base is more confusing than useful.
 */
export function mergeConfig(base: Config, input: unknown, options: { allowShortcuts?: boolean } = {}): Config {
	if (!isRecord(input)) throw new Error("configuration must be a JSON object");

	let reserveTokens = base.reserveTokens;
	if (input.reserveTokens !== undefined) {
		if (typeof input.reserveTokens !== "number" || !Number.isInteger(input.reserveTokens) || input.reserveTokens < 0) {
			throw new Error('"reserveTokens" must be a non-negative integer');
		}
		reserveTokens = input.reserveTokens;
	}

	const shortcuts = { ...base.shortcuts };
	if (options.allowShortcuts !== false && input.shortcuts !== undefined) {
		if (!isRecord(input.shortcuts)) throw new Error('"shortcuts" must be an object');
		for (const name of ["context", "fast"] as const) {
			const candidate = input.shortcuts[name];
			if (candidate === undefined) continue;
			const trimmed = typeof candidate === "string" ? candidate.trim() : "";
			if (!isKeyId(trimmed)) {
				throw new Error(`"shortcuts.${name}" must be a valid pi key identifier`);
			}
			shortcuts[name] = trimmed;
		}
	}

	const models = { ...base.models };
	if (input.models !== undefined) {
		if (!isRecord(input.models)) throw new Error('"models" must be an object');
		for (const [key, raw] of Object.entries(input.models)) {
			models[key] = parseModel(key, raw, reserveTokens);
		}
	}

	return { reserveTokens, shortcuts, models };
}

export interface LoadResult {
	config: Config;
	error?: string | undefined;
}

function readConfigFile(path: string, base: Config, options: { allowShortcuts?: boolean } = {}): LoadResult {
	if (!existsSync(path)) return { config: base };

	try {
		return { config: mergeConfig(base, JSON.parse(readFileSync(path, "utf8")), options) };
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : String(cause);
		return { config: base, error: `${path}: ${message}` };
	}
}

/** Reads the global config. Called once at load time so the shortcut bindings are known before registration. */
export function loadGlobalConfig(): LoadResult {
	const base: Config = {
		reserveTokens: readReserveTokens(),
		shortcuts: { ...DEFAULT_SHORTCUTS },
		models: {},
	};
	return readConfigFile(join(getAgentDir(), CONFIG_FILE_NAME), base);
}

/**
 * Layers a trusted project's config over the global one, keeping the global
 * shortcuts. Returns the global config untouched when the project is not
 * trusted or has no config file.
 */
export function loadProjectConfig(global: LoadResult, cwd: string, configDirName: string): LoadResult {
	const result = readConfigFile(join(cwd, configDirName, CONFIG_FILE_NAME), global.config, {
		allowShortcuts: false,
	});

	return {
		config: { ...result.config, shortcuts: global.config.shortcuts },
		error: result.error ?? global.error,
	};
}
