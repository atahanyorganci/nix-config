import { describe, expect, it } from "vitest";
import { type Config, mergeConfig } from "../src/model-profile/config.ts";
import {
	DEFAULT_FAST_COST_MULTIPLIER,
	setFastMode,
	settleFastResponse,
	withFastPath,
} from "../src/model-profile/fast.ts";
import { State, baseStatus } from "../src/model-profile/state.ts";
import type { AnyModel } from "../src/model-profile/state.ts";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

const base: Config = {
	reserveTokens: 16_384,
	shortcuts: { context: "alt+shift+c", fast: "alt+shift+f" },
	models: {},
};

const config = mergeConfig(base, {
	models: {
		"llm-gateway/claude-code/claude-opus-5-5": {
			defaultContext: "272k",
			context: { "272k": 272_000, full: 1_000_000 },
			fast: true,
		},
		"llm-gateway/claude-code/claude-sonnet-5-5": {
			context: { "272k": 272_000, full: 1_000_000 },
		},
		"llm-gateway/codex/gpt-6.1-sol": { fast: true, fastCostMultiplier: 3 },
		"anthropic/claude-opus-5-5": { fast: true },
	},
});

function model(provider: string, id: string, api = "openai-completions"): AnyModel {
	return { provider, id, api, contextWindow: 272_000 } as unknown as AnyModel;
}

const opus = model("llm-gateway", "claude-code/claude-opus-5-5");
const sonnet = model("llm-gateway", "claude-code/claude-sonnet-5-5");
const anthropicOpus = model("anthropic", "claude-opus-5-5", "anthropic-messages");
const sol = model("llm-gateway", "codex/gpt-6.1-sol");

interface Notice {
	message: string;
	level: string | undefined;
}

function context(active: AnyModel | undefined) {
	const notices: Notice[] = [];
	const status: { value: string | undefined } = { value: undefined };
	const ctx = {
		model: active,
		ui: {
			notify: (message: string, level?: string) => notices.push({ message, level }),
			setStatus: (_key: string, value: string | undefined) => {
				status.value = value;
			},
		},
	} as unknown as ExtensionContext;
	return { ctx, notices, status };
}

function assistant(target: AnyModel, fields: Record<string, unknown> = {}) {
	return {
		role: "assistant",
		provider: target.provider,
		model: target.id,
		stopReason: "stop",
		usage: { input: 10, output: 5, cost: { input: 1, output: 2, cacheRead: 0.5, cacheWrite: 0.25, total: 3.75 } },
		...fields,
	};
}

describe("config", () => {
	it("reads fast as a boolean, defaulting to false", () => {
		expect(config.models["llm-gateway/claude-code/claude-opus-5-5"]?.fast).toBe(true);
		expect(config.models["llm-gateway/claude-code/claude-sonnet-5-5"]?.fast).toBe(false);
	});

	it("rejects the old fast-target object with a migration hint", () => {
		expect(() => mergeConfig(base, { models: { "p/m": { fast: { model: "other" } } } })).toThrow(
			/"fast" is now a boolean/,
		);
	});

	it("reads a per-model fast cost multiplier", () => {
		expect(config.models["llm-gateway/codex/gpt-6.1-sol"]?.fastCostMultiplier).toBe(3);
		expect(config.models["llm-gateway/claude-code/claude-opus-5-5"]?.fastCostMultiplier).toBeUndefined();
	});

	it.each([
		[{ fastCostMultiplier: 2 }, /needs "fast": true/],
		[{ fast: true, fastCostMultiplier: 0.5 }, /at least 1/],
		[{ fast: true, fastCostMultiplier: "2" }, /at least 1/],
	])("rejects a bad fast cost multiplier: %j", (entry, message) => {
		expect(() => mergeConfig(base, { models: { "p/m": entry } })).toThrow(message);
	});

	it("rejects an entry that configures nothing", () => {
		expect(() => mergeConfig(base, { models: { "p/m": { fast: false } } })).toThrow(/must define "context"/);
	});
});

describe("switch", () => {
	it("refuses to enable on a model without fast mode", () => {
		const state = new State(config);
		const { ctx, notices } = context(sonnet);
		expect(setFastMode(state, ctx, true)).toBe(false);
		expect(state.fastEnabled).toBe(false);
		expect(notices[0]?.message).toMatch(/No fast mode configured/);
	});

	it("refuses to enable over an API that cannot ask for it", () => {
		const state = new State(config);
		const { ctx, notices } = context(anthropicOpus);
		expect(setFastMode(state, ctx, true)).toBe(false);
		expect(notices[0]?.message).toMatch(/anthropic-messages API/);
	});

	it("stays on across a model without fast mode, and says so in the footer", () => {
		const state = new State(config);
		const { ctx, status } = context(opus);
		expect(setFastMode(state, ctx, true)).toBe(true);
		expect(status.value).toBe("ctx:272k ⚡");
		expect(baseStatus(state, sonnet)).toBe("ctx:272k ⚡ n/a");
		expect(state.fastApplies(sonnet)).toBe(false);
	});

	it("can always be turned off", () => {
		const state = new State(config);
		state.fastEnabled = true;
		const { ctx } = context(sonnet);
		expect(setFastMode(state, ctx, false)).toBe(true);
		expect(state.fastEnabled).toBe(false);
	});
});

describe("requests", () => {
	const payload = { model: opus.id, messages: [] };

	it("asks for the priority tier while fast mode applies", () => {
		const state = new State(config);
		state.fastEnabled = true;
		const { ctx } = context(opus);
		expect(withFastPath(state, ctx, payload)).toEqual({ ...payload, service_tier: "priority" });
		expect(state.fastRequest).toBe("llm-gateway/claude-code/claude-opus-5-5");
	});

	it("leaves the payload alone when fast mode is off or does not apply", () => {
		const state = new State(config);
		expect(withFastPath(state, context(opus).ctx, payload)).toBeUndefined();

		state.fastEnabled = true;
		expect(withFastPath(state, context(sonnet).ctx, { model: sonnet.id })).toBeUndefined();
		expect(state.fastRequest).toBeUndefined();
	});

	it("leaves a payload built for another model alone", () => {
		const state = new State(config);
		state.fastEnabled = true;
		expect(withFastPath(state, context(opus).ctx, { model: "something-else" })).toBeUndefined();
		expect(state.fastRequest).toBeUndefined();
	});
});

describe("responses", () => {
	it("scales the cost of a response that was sent fast", () => {
		const state = new State(config);
		state.fastRequest = "llm-gateway/claude-code/claude-opus-5-5";
		const settled = settleFastResponse(state, context(opus).ctx, assistant(opus)) as ReturnType<typeof assistant>;
		expect(settled.usage.cost).toEqual({
			input: 1 * DEFAULT_FAST_COST_MULTIPLIER,
			output: 2 * DEFAULT_FAST_COST_MULTIPLIER,
			cacheRead: 0.5 * DEFAULT_FAST_COST_MULTIPLIER,
			cacheWrite: 0.25 * DEFAULT_FAST_COST_MULTIPLIER,
			total: 3.75 * DEFAULT_FAST_COST_MULTIPLIER,
		});
		expect(settled.usage.input).toBe(10);
		expect(state.fastRequest).toBeUndefined();
	});

	it("scales by the model's own multiplier when it has one", () => {
		const state = new State(config);
		state.fastRequest = "llm-gateway/codex/gpt-6.1-sol";
		const settled = settleFastResponse(state, context(sol).ctx, assistant(sol)) as ReturnType<typeof assistant>;
		expect(settled.usage.cost.total).toBe(3.75 * 3);
	});

	it("keeps the cost of a standard response", () => {
		const state = new State(config);
		expect(settleFastResponse(state, context(opus).ctx, assistant(opus))).toBeUndefined();
	});

	it("ignores messages other than assistant responses", () => {
		const state = new State(config);
		state.fastRequest = "llm-gateway/claude-code/claude-opus-5-5";
		expect(settleFastResponse(state, context(opus).ctx, { role: "user", content: "hi" })).toBeUndefined();
		expect(state.fastRequest).toBe("llm-gateway/claude-code/claude-opus-5-5");
	});

	it.each([
		["fast_mode_credits_required: Usage credits are required for fast mode.", /no fast-mode credits/],
		["fast_mode_unsupported: `claude-code/claude-opus-5-5` does not offer fast mode.", /does not offer it/],
	])("turns fast mode off on %s", (errorMessage, reason) => {
		const state = new State(config);
		state.fastEnabled = true;
		state.fastRequest = "llm-gateway/claude-code/claude-opus-5-5";
		const { ctx, notices } = context(opus);
		expect(settleFastResponse(state, ctx, assistant(opus, { stopReason: "error", errorMessage }))).toBeUndefined();
		expect(state.fastEnabled).toBe(false);
		expect(notices[0]).toEqual({ message: expect.stringMatching(reason), level: "error" });
	});

	it("keeps fast mode on through a rate limit, which pi retries", () => {
		const state = new State(config);
		state.fastEnabled = true;
		const { ctx, notices } = context(opus);
		const errorMessage = "fast_mode_rate_limited: Fast mode rate limit exceeded. Try again later.";
		settleFastResponse(state, ctx, assistant(opus, { stopReason: "error", errorMessage }));
		expect(state.fastEnabled).toBe(true);
		expect(notices[0]?.level).toBe("warning");
	});
});
