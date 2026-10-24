import { describe, expect, it } from "vitest";
import { compactionLevel, parseConfig } from "../src/compaction-thinking/config.ts";
import { type CompactionPreparation, inheritFileOps } from "../src/compaction-thinking/index.ts";
import type { SessionEntry } from "@earendil-works/pi-coding-agent";

const opus = "llm-gateway/claude-code/claude-opus-5-5";

describe("parseConfig", () => {
	it("accepts level maps keyed by model", () => {
		expect(parseConfig({ models: { [opus]: { max: "high", xhigh: "high" } } })).toEqual({
			models: { [opus]: { max: "high", xhigh: "high" } },
		});
	});

	it("treats a missing models key as empty", () => {
		expect(parseConfig({})).toEqual({ models: {} });
	});

	it("rejects unknown source levels", () => {
		expect(() => parseConfig({ models: { [opus]: { ultra: "high" } } })).toThrow(/"ultra" is not a thinking level/);
	});

	it("rejects unknown target levels", () => {
		expect(() => parseConfig({ models: { [opus]: { max: "lots" } } })).toThrow(/"max" must map to one of/);
	});

	it("rejects non-object models", () => {
		expect(() => parseConfig({ models: { [opus]: "high" } })).toThrow(/must be an object/);
		expect(() => parseConfig({ models: [] })).toThrow(/"models" must be an object/);
	});
});

describe("compactionLevel", () => {
	const config = parseConfig({ models: { [opus]: { max: "high", high: "high" } } });

	it("remaps a configured level", () => {
		expect(compactionLevel(config, opus, "max")).toBe("high");
	});

	it("leaves unmapped levels and models to pi", () => {
		expect(compactionLevel(config, opus, "medium")).toBeUndefined();
		expect(compactionLevel(config, "anthropic/claude-opus-5-5", "max")).toBeUndefined();
	});

	it("leaves identity mappings to pi", () => {
		expect(compactionLevel(config, opus, "high")).toBeUndefined();
	});
});

describe("inheritFileOps", () => {
	function preparation(): CompactionPreparation {
		return {
			fileOps: { read: new Set(["a.ts"]), written: new Set(), edited: new Set() },
		} as unknown as CompactionPreparation;
	}

	function compaction(fromHook: boolean): SessionEntry {
		return {
			type: "compaction",
			id: "c1",
			parentId: null,
			timestamp: new Date(0).toISOString(),
			summary: "",
			firstKeptEntryId: "e1",
			tokensBefore: 0,
			fromHook,
			details: { readFiles: ["b.ts"], modifiedFiles: ["c.ts"] },
		} as SessionEntry;
	}

	it("carries file lists over from an extension-written compaction", () => {
		const prep = preparation();
		inheritFileOps(prep, [compaction(true)]);
		expect([...prep.fileOps.read]).toEqual(["a.ts", "b.ts"]);
		expect([...prep.fileOps.edited]).toEqual(["c.ts"]);
	});

	it("leaves pi's own compactions to pi", () => {
		const prep = preparation();
		inheritFileOps(prep, [compaction(false)]);
		expect([...prep.fileOps.read]).toEqual(["a.ts"]);
		expect([...prep.fileOps.edited]).toEqual([]);
	});
});
