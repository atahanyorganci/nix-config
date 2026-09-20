/**
 * Locates an installed `@earendil-works/pi-coding-agent` to read types from.
 *
 * The generator reads whichever copy the caller points at, so the emitted
 * options always correspond to a specific pi version rather than to whatever
 * happens to be on PATH.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface PiPackage {
	root: string;
	version: string;
	settingsManagerDts: string;
	keybindingsDts: string;
	tuiKeybindingsDts: string;
	settingsDocs: string;
	keybindingsDocs: string;
}

const require0 = (path: string, what: string): string => {
	if (!existsSync(path)) {
		throw new Error(`${what} not found at ${path} — is this a pi-coding-agent package root?`);
	}
	return path;
};

/**
 * Resolve the pi package layout from its root directory.
 *
 * `root` is the directory containing pi's `package.json` (the `pi-monorepo`
 * directory in a Nix store path, or `node_modules/@earendil-works/pi-coding-agent`
 * in an npm install).
 */
export const resolvePiPackage = (root: string): PiPackage => {
	const packageJsonPath = require0(join(root, "package.json"), "package.json");
	const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { name?: string; version?: string };
	if (packageJson.version === undefined) {
		throw new Error(`${packageJsonPath} has no version field`);
	}
	return {
		root,
		version: packageJson.version,
		settingsManagerDts: require0(join(root, "dist/core/settings-manager.d.ts"), "settings-manager.d.ts"),
		keybindingsDts: require0(join(root, "dist/core/keybindings.d.ts"), "keybindings.d.ts"),
		tuiKeybindingsDts: require0(
			join(root, "node_modules/@earendil-works/pi-tui/dist/keybindings.d.ts"),
			"pi-tui keybindings.d.ts",
		),
		settingsDocs: require0(join(root, "docs/settings.md"), "docs/settings.md"),
		keybindingsDocs: require0(join(root, "docs/keybindings.md"), "docs/keybindings.md"),
	};
};
