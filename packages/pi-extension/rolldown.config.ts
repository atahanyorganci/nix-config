import { defineConfig } from "rolldown";

/**
 * Bundle each extension into a single self-contained file under `dist`.
 *
 * Pi loads extensions straight from disk and resolves no dependencies of its
 * own beyond the packages it injects, so anything else has to be inlined.
 * Bundling also keeps the shipped artifact a handful of files rather than a
 * `node_modules` tree, whose symlinks break once copied into the Nix store.
 */
export default defineConfig({
	// One bundle per extension. The directory layout mirrors `src`, so
	// `pi.extensions` can point at `./dist/<name>` and pi picks up the
	// `index.js` inside.
	input: {
		"fetch-content": "src/fetch-content/index.ts",
		usage: "src/usage/index.ts",
		"web-search": "src/web-search/index.ts",
	},
	platform: "node",

	// Pi injects these at load time. Inlining them would ship a second copy of
	// the SDK, whose classes fail instanceof checks against the objects pi
	// hands to the extension. Everything else is inlined, which is rolldown's
	// default.
	external: [/^@earendil-works\//, "typebox"],

	output: {
		dir: "dist",
		format: "esm",
		entryFileNames: "[name]/index.js",

		// Pi loads each extension on its own, so no entry may depend on a
		// sibling chunk: hoisting shared code would emit imports that only
		// resolve relative to `dist`.
		inlineDynamicImports: false,
		manualChunks: () => null,

		// A stack trace pointing into a bundle is unreadable without this, and
		// pi parses the source rather than serving it, so size costs nothing.
		sourcemap: true,
		minify: false,
	},
});
