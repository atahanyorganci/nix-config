import { defineConfig } from "oxlint";

export default defineConfig({
	options: {
		typeAware: true,
		typeCheck: true,
		denyWarnings: true,
		reportUnusedDisableDirectives: "error",
	},
	rules: {
		"typescript/consistent-type-imports": [
			"error",
			{ disallowTypeAnnotations: true, fixStyle: "separate-type-imports" },
		],
	},
});
