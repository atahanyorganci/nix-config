#!/usr/bin/env bun
/**
 * Generates the Nix option declarations consumed by the `programs.pi` module.
 *
 * Usage:
 *   bun src/main.ts --pi-root <dir> --out-dir <dir> [--check]
 *
 * `--check` regenerates in memory and exits non-zero if the result differs from
 * what is on disk, so CI can prove the committed files match the pinned pi.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as ts from "typescript-5";
import { parseKeybindingDocs, parseSettingsDocs } from "./docs.ts";
import { type EmitMeta, emitKeybindingsFile, emitOptionsFile } from "./emit.ts";
import { Extractor } from "./extract.ts";
import { resolvePiPackage } from "./resolve.ts";
import type { OptionNode } from "./model.ts";

const REGENERATE_HINT = "bun run --filter @yorganci/pi-nix-options generate";

interface Args {
	piRoot: string;
	outDir: string;
	check: boolean;
}

const parseArgs = (argv: string[]): Args => {
	let piRoot: string | undefined;
	let outDir: string | undefined;
	let check = false;
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--pi-root") {
			piRoot = argv[++index];
		} else if (arg === "--out-dir") {
			outDir = argv[++index];
		} else if (arg === "--check") {
			check = true;
		} else if (arg === "--help" || arg === "-h") {
			console.log("usage: pi-nix-options --pi-root <dir> --out-dir <dir> [--check]");
			process.exit(0);
		}
	}
	if (piRoot === undefined || outDir === undefined) {
		throw new Error("both --pi-root and --out-dir are required (see --help)");
	}
	return { piRoot, outDir, check };
};

/** Attach docs prose to the extracted option tree, in place. */
const annotate = (options: OptionNode[], docs: Map<string, { default?: string; description: string }>): void => {
	for (const option of options) {
		const entry = docs.get(option.path);
		if (entry !== undefined) {
			option.description = entry.description;
			if (entry.default !== undefined) {
				option.upstreamDefault = entry.default;
			}
		}
		if (option.type.kind === "submodule") {
			annotate(option.type.options, docs);
		}
	}
};

const countOptions = (options: OptionNode[]): number =>
	options.reduce(
		(total, option) => total + 1 + (option.type.kind === "submodule" ? countOptions(option.type.options) : 0),
		0,
	);

const main = (): void => {
	const args = parseArgs(process.argv.slice(2));
	const pi = resolvePiPackage(args.piRoot);

	const extractor = new Extractor({ settingsManagerDts: pi.settingsManagerDts, packageRoot: pi.root });
	if (extractor.diagnostics.length > 0) {
		// Without clean resolution, cross-package aliases collapse to `any` and
		// every enum would silently become types.anything.
		const messages = extractor.diagnostics
			.slice(0, 5)
			// messageText is a linked chain for multi-part errors, so flatten it
			// rather than stringifying the object.
			.map(diagnostic => `  ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`)
			.join("\n");
		throw new Error(
			`pi's settings-manager.d.ts did not type-check cleanly (${extractor.diagnostics.length} diagnostics).\n` +
				`Cross-package type aliases would degrade to 'any'.\n${messages}`,
		);
	}

	const options = extractor.extractSettings();
	annotate(options, parseSettingsDocs(readFileSync(pi.settingsDocs, "utf8")));

	const appIds = Extractor.keybindingIds(pi.keybindingsDts, "AppKeybindings");
	const tuiIds = Extractor.keybindingIds(pi.tuiKeybindingsDts, "Keybindings");
	const keybindingIds = [...new Set([...appIds, ...tuiIds])];
	const keybindingDocs = parseKeybindingDocs(readFileSync(pi.keybindingsDocs, "utf8"));

	const meta: EmitMeta = {
		piVersion: pi.version,
		generator: REGENERATE_HINT,
		skipped: extractor.skipped,
	};

	const files: Record<string, string> = {
		"settings-options.nix": emitOptionsFile(options, meta),
		"keybinding-options.nix": emitKeybindingsFile(keybindingIds, keybindingDocs, meta),
	};

	if (args.check) {
		let drift = false;
		for (const [name, content] of Object.entries(files)) {
			const path = join(args.outDir, name);
			let existing: string | undefined;
			try {
				existing = readFileSync(path, "utf8");
			} catch {
				existing = undefined;
			}
			if (existing !== content) {
				console.error(`drift: ${path} is out of date — run \`${REGENERATE_HINT}\``);
				drift = true;
			}
		}
		if (drift) {
			process.exit(1);
		}
		console.log(`up to date (pi ${pi.version})`);
		return;
	}

	mkdirSync(args.outDir, { recursive: true });
	for (const [name, content] of Object.entries(files)) {
		writeFileSync(join(args.outDir, name), content, "utf8");
	}

	console.log(
		`generated from pi ${pi.version}: ${countOptions(options)} settings options, ` +
			`${keybindingIds.length} keybinding ids, ${extractor.skipped.length} skipped`,
	);
	for (const entry of extractor.skipped) {
		console.log(`  skipped ${entry.path} (${entry.reason})`);
	}
};

main();
