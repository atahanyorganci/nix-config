#!/usr/bin/env bun

import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
/**
 * NetBird SDK code generator.
 *
 * Uses distilled's shared OpenAPI generator, then removes the operations barrel
 * so consumers deep-import via package exports `./*`.
 *
 * Published @distilled.cloud/core omits scripts/; use the vendored generator.
 */
import { generateFromOpenAPI } from "../../../vendor/distilled/packages/core/scripts/generate-openapi.ts";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(rootDir, "src/operations");

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

generateFromOpenAPI({
	specPath: join(rootDir, "spec/netbird.api.json"),
	patchDir: join(rootDir, "patches"),
	outputDir,
	importPrefix: "..",
	clientImport: "../client",
	traitsImport: "../traits",
	sensitiveImport: "../sensitive",
	errorsImport: "../errors",
	includeOperationErrors: true,
	skipDeprecated: true,
});

rmSync(join(outputDir, "index.ts"), { force: true });
