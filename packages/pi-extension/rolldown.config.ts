import { defineConfig } from "rolldown";

/**
 * Bundle each extension into a single self-contained file under `dist`.
 *
 * Pi loads extensions straight from disk and resolves no dependencies of its
 * own beyond the packages it injects, so anything else has to be inlined.
 * Bundling also keeps the shipped artifact a handful of files rather than a
 * `node_modules` tree, whose symlinks break once copied into the Nix store.
 */

const EXTENSIONS = ["fetch-content", "model-profile", "usage", "web-search"];

// Pi injects these at load time. Inlining them would ship a second copy of
// the SDK, whose classes fail instanceof checks against the objects pi hands
// to the extension. Everything else is inlined, which is rolldown's default.
const EXTERNAL = [/^@earendil-works\//, "typebox"];

/**
 * One build per extension, rather than one build with several inputs.
 *
 * A shared build can only inline dynamic imports for all entries or none, and
 * turning it off lets a dependency emit a sibling chunk: unpdf reaches PDF.js
 * that way, which produced an `import("../pdfjs-*.js")` pointing outside the
 * extension's own directory — the one place pi cannot follow, since each
 * extension is installed as a standalone folder.
 */
export default defineConfig(
	EXTENSIONS.map(name => ({
		input: { [name]: `src/${name}/index.ts` },
		platform: "node" as const,
		external: EXTERNAL,
		output: {
			dir: "dist",
			format: "esm" as const,
			entryFileNames: "[name]/index.js",

			// Everything the entry reaches, static or dynamic, ends up in its
			// own file. With one entry per build this cannot merge unrelated
			// extensions together.
			inlineDynamicImports: true,

			// A stack trace pointing into a bundle is unreadable without this,
			// and pi parses the source rather than serving it, so size costs
			// nothing.
			sourcemap: true,
			minify: false,
		},
	})),
);
