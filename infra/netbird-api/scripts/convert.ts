#!/usr/bin/env bun
import { convertOpenApiToSmithy } from "@distilled.cloud/core/codegen/openapi";
import { applyOperation, isStaleTargetError, type PatchFile } from "@distilled.cloud/core/json-patch";
/**
 * convert — NetBird's OpenAPI description → Smithy JSON models in
 * .generated-specs, one model (one service module) per API tag.
 *
 *   1. Read spec/netbird.api.json (written by scripts/download.ts, which
 *      already assigns path-derived operation ids such as `policiesPost`).
 *   2. Apply every patches/*.patch.json RFC-6902 chain ONCE to the full
 *      document. Stale targets warn and skip (the spec is refetched from a
 *      tagged upstream file and drifts); malformed patches fail the run.
 *   3. Bucket operations by their single tag and convert each bucket through
 *      distilled's shared `convertOpenApiToSmithy`.
 *
 * `scripts/generate.ts` then compiles the models with `patchesDir: false`:
 * patches apply here, to the OpenAPI document, never to the Smithy models.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const rootDir = path.resolve(import.meta.dir, "..");
const specPath = path.join(rootDir, "spec/netbird.api.json");
const patchDir = path.join(rootDir, "patches");
const outDir = path.join(rootDir, ".generated-specs");

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

/** `Setup Keys` → `setup_keys`, `IDP Okta SCIM Integrations` → `idp_okta_scim_integrations`. */
const toSlug = (tag: string): string =>
	tag
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replace(/[^a-zA-Z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.toLowerCase();

const toPascal = (slug: string): string =>
	slug
		.split("_")
		.filter(Boolean)
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");

// ---- 1. Read the full spec ----------------------------------------------
if (!fs.existsSync(specPath)) {
	throw new Error(`${specPath} not found — run \`bun run spec:download\` first`);
}
const fullSpec = JSON.parse(fs.readFileSync(specPath, "utf-8"));

// ---- 2. Apply the patch chain once to the full document -----------------
let patchFiles = 0;
let staleOps = 0;
const badPatches: string[] = [];
const patchNames = fs.existsSync(patchDir)
	? fs
			.readdirSync(patchDir)
			.filter(file => file.endsWith(".patch.json"))
			.sort()
	: [];
for (const file of patchNames) {
	const parsed = JSON.parse(fs.readFileSync(path.join(patchDir, file), "utf-8")) as PatchFile;
	for (const patchOp of parsed.patches ?? []) {
		try {
			applyOperation(fullSpec, patchOp);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (isStaleTargetError(message)) {
				staleOps++;
				console.warn(`   ⚠️  stale: ${file} [${patchOp.op} ${patchOp.path}]`);
			} else {
				badPatches.push(`${file} [${patchOp.op} ${patchOp.path}]: ${message}`);
			}
		}
	}
	patchFiles++;
}
if (badPatches.length > 0) {
	for (const bad of badPatches) console.error(`❌ bad patch: ${bad}`);
	throw new Error(`${badPatches.length} malformed patch operation(s) — fix or remove them`);
}
if (patchFiles > 0) {
	console.log(`🩹 ${patchFiles} patch files applied${staleOps ? ` (${staleOps} stale op(s) skipped)` : ""}`);
}

// ---- 3. Bucket paths by tag ---------------------------------------------
const tagBuckets = new Map<string, Record<string, Record<string, unknown>>>();
const untagged: string[] = [];
const deprecated: string[] = [];
for (const [pathTemplate, pathItem] of Object.entries<Record<string, unknown>>(fullSpec.paths)) {
	for (const method of HTTP_METHODS) {
		const op = (pathItem as Record<string, any>)[method];
		if (!op) continue;
		if (op.deprecated === true) {
			deprecated.push(`${method.toUpperCase()} ${pathTemplate} (${op.operationId})`);
		}
		const rawTag: string | undefined = Array.isArray(op.tags) && op.tags.length > 0 ? op.tags[0] : undefined;
		if (rawTag === undefined) untagged.push(`${method.toUpperCase()} ${pathTemplate}`);
		const slug = toSlug(rawTag ?? "misc") || "misc";
		if (!tagBuckets.has(slug)) tagBuckets.set(slug, {});
		const bucketPaths = tagBuckets.get(slug)!;
		if (!bucketPaths[pathTemplate]) {
			const pathParams = (pathItem as Record<string, any>).parameters;
			bucketPaths[pathTemplate] = pathParams ? { parameters: pathParams } : {};
		}
		(bucketPaths[pathTemplate] as Record<string, unknown>)[method] = op;
	}
}
if (untagged.length > 0) {
	console.warn(
		`   ⚠️  ${untagged.length} untagged operation(s) fell into \`misc\`:\n      ${untagged.join("\n      ")}`,
	);
}

// ---- 4. Convert each bucket ---------------------------------------------
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

/**
 * NetBird declares its failure statuses per operation. Map each to the
 * shared error class of that name (all exported from src/errors.ts) so the
 * generated operations carry typed errors. Statuses outside the table ride
 * NetbirdOpError through the protocol's status map at runtime.
 */
const statusToErrorClass = {
	400: "BadRequest",
	401: "Unauthorized",
	403: "Forbidden",
	404: "NotFound",
	409: "Conflict",
	422: "UnprocessableEntity",
	423: "Locked",
	429: "TooManyRequests",
	500: "InternalServerError",
	502: "BadGateway",
	503: "ServiceUnavailable",
	504: "GatewayTimeout",
};

let written = 0;
let totalOps = 0;
const emptyBuckets: string[] = [];
for (const slug of [...tagBuckets.keys()].sort()) {
	const paths = tagBuckets.get(slug)!;
	const subSpec = { ...fullSpec, paths };
	const model = convertOpenApiToSmithy(subSpec, {
		namespace: `io.netbird.${slug}`,
		serviceName: toPascal(slug),
		skipDeprecated: true,
		statusToErrorClass,
	});
	const operations = Object.entries<any>(model.shapes).filter(([, shape]) => shape.type === "operation");
	if (operations.length === 0) {
		emptyBuckets.push(slug);
		continue;
	}
	fs.writeFileSync(path.join(outDir, `${slug}.json`), `${JSON.stringify(model, null, 2)}\n`);
	written++;
	totalOps += operations.length;
}

if (deprecated.length > 0) {
	console.log(`🗑️  ${deprecated.length} deprecated operation(s) skipped:\n      ${deprecated.join("\n      ")}`);
}
if (emptyBuckets.length > 0) {
	console.log(`   (${emptyBuckets.length} tag(s) dropped — every operation deprecated: ${emptyBuckets.join(", ")})`);
}
console.log(`✅ ${written} Smithy models (${totalOps} operations) → ${outDir}`);
