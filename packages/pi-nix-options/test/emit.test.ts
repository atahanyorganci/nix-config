import { describe, expect, it } from "vitest";
import { parseKeybindingDocs, parseSettingsDocs } from "../src/docs.ts";
import { nixAttrName, nixString, renderOption, renderType } from "../src/emit.ts";

describe("nixString", () => {
	it("escapes quotes and backslashes", () => {
		expect(nixString('a "b" c')).toBe('"a \\"b\\" c"');
		expect(nixString("a\\b")).toBe('"a\\\\b"');
	});
});

describe("nixAttrName", () => {
	it("leaves plain identifiers unquoted", () => {
		expect(nixAttrName("defaultModel")).toBe("defaultModel");
	});

	it("quotes dotted keybinding ids, which would otherwise nest attrsets", () => {
		expect(nixAttrName("tui.editor.cursorUp")).toBe('"tui.editor.cursorUp"');
	});
});

describe("renderType", () => {
	it("renders closed string unions as enums", () => {
		expect(renderType({ kind: "enum", values: ["a", "b"] }, 0)).toBe('types.enum [ "a" "b" ]');
	});

	it("renders numeric literal unions as a bounded int", () => {
		expect(renderType({ kind: "intBetween", lo: 0, hi: 1 }, 0)).toBe("types.ints.between 0 1");
	});

	it("folds n-ary unions into nested either", () => {
		const rendered = renderType({ kind: "oneOf", of: [{ kind: "bool" }, { kind: "enum", values: ["auto"] }] }, 0);
		expect(rendered).toBe('types.either (types.bool) (types.enum [ "auto" ])');
	});

	it("nests listOf and attrsOf element types", () => {
		expect(renderType({ kind: "listOf", of: { kind: "str" } }, 0)).toBe("types.listOf (types.str)");
		expect(renderType({ kind: "attrsOf", of: { kind: "str" } }, 0)).toBe("types.attrsOf (types.str)");
	});
});

describe("renderOption", () => {
	it("makes every option nullable and null-defaulted so unset keys stay absent", () => {
		const rendered = renderOption({ name: "theme", path: "theme", type: { kind: "str" } }, 0);
		expect(rendered).toContain("type = types.nullOr (types.str);");
		expect(rendered).toContain("default = null;");
	});

	it("documents pi's default instead of baking it in", () => {
		const rendered = renderOption(
			{ name: "theme", path: "theme", type: { kind: "str" }, description: "Theme name", upstreamDefault: '"dark"' },
			0,
		);
		expect(rendered).toContain("default = null;");
		expect(rendered).toContain("Pi's default when unset");
		expect(rendered).not.toMatch(/default = "dark"/);
	});

	it("separates the description from the appended default sentence", () => {
		const rendered = renderOption(
			{ name: "x", path: "x", type: { kind: "bool" }, description: "Does a thing", upstreamDefault: "true" },
			0,
		);
		expect(rendered).toContain("Does a thing. Pi's default when unset: true.");
	});
});

describe("parseSettingsDocs", () => {
	it("extracts key, default and description from a settings table", () => {
		const entries = parseSettingsDocs(
			[
				"| Setting | Type | Default | Description |",
				"|---------|------|---------|-------------|",
				"| `compaction.enabled` | boolean | `true` | Enable auto-compaction |",
				'| `theme` | string | `"dark"` | Theme name |',
			].join("\n"),
		);
		expect(entries.get("compaction.enabled")).toMatchObject({
			default: "true",
			description: "Enable auto-compaction",
		});
		expect(entries.get("theme")?.default).toBe('"dark"');
	});

	it("treats a bare dash default as absent rather than the literal '-'", () => {
		const entries = parseSettingsDocs(["| `defaultModel` | string | - | Startup model ID |"].join("\n"));
		expect(entries.get("defaultModel")?.default).toBeUndefined();
	});
});

describe("parseKeybindingDocs", () => {
	// The keybinding tables have three columns, not the settings tables' four.
	it("reads id, default binding and description from a three-column table", () => {
		const entries = parseKeybindingDocs(
			[
				"| Keybinding id | Default | Description |",
				"|--------|---------|-------------|",
				"| `app.clear` | `ctrl+c` | Clear editor (first) / exit (second) |",
				"| `tui.editor.cursorUp` | `up`, `ctrl+p` | Move cursor up |",
			].join("\n"),
		);
		expect(entries.get("app.clear")).toMatchObject({
			default: "ctrl+c",
			description: "Clear editor (first) / exit (second)",
		});
		expect(entries.get("tui.editor.cursorUp")?.default).toBe("up, ctrl+p");
	});

	it("treats *(none)* as having no default binding", () => {
		const entries = parseKeybindingDocs("| `tui.editor.historyPrevious` | *(none)* | Previous entry |");
		expect(entries.get("tui.editor.historyPrevious")?.default).toBeUndefined();
	});
});
