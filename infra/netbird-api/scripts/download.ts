#!/usr/bin/env bun

import { BunCrypto, BunFileSystem, BunHttpClient, BunPath, BunRuntime } from "@effect/platform-bun";
import { Console, Crypto, Effect, FileSystem, Layer, Path } from "effect";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import * as Yaml from "yaml";
import pkg from "../package.json" with { type: "json" };

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);

const { ref, path: specPath, sha256 } = pkg.spec;
const specUrl = `https://raw.githubusercontent.com/netbirdio/netbird/${ref}/${specPath}`;

type Operation = { operationId?: string; parameters?: Parameter[] };
type Parameter = { name?: string; in?: string; $ref?: string };
type PathItem = Record<string, unknown> & { parameters?: Parameter[] };
type OpenApiDoc = { paths?: Record<string, PathItem> };

const toHex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");

const toPascalSegment = (segment: string): string => {
	const cleaned = segment.replace(/[{}]/g, "").replace(/[^a-zA-Z0-9]+/g, " ");
	return cleaned
		.split(/\s+/)
		.filter(Boolean)
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");
};

/**
 * Noun-verb so same-resource ops sort together lexicographically.
 * e.g. GET /api/peers/{peerId}/jobs → peersPeerIdJobsGet
 */
const synthesizeOperationId = (method: string, pathTemplate: string): string => {
	const segments = pathTemplate.split("/").filter(Boolean);
	const meaningful = segments[0] === "api" ? segments.slice(1) : segments;
	const resource = meaningful.map(toPascalSegment).join("") || "Root";
	const noun = resource.charAt(0).toLowerCase() + resource.slice(1);
	const verb = method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
	return `${noun}${verb}`;
};

/** `peer-id` → `peerId` for valid Schema.Struct keys */
const toJsIdent = (name: string): string => {
	if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) return name;
	const camel = name
		.replace(/[^a-zA-Z0-9]+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase())
		.replace(/[^a-zA-Z0-9_$]/g, "");
	return camel.charAt(0).toLowerCase() + camel.slice(1);
};

const renameParameter = (param: Parameter): void => {
	if (!param.name) return;
	const next = toJsIdent(param.name);
	if (next !== param.name) param.name = next;
};

/** Rename hyphenated path params so the OpenAPI generator emits valid TS. */
const normalizePathParamNames = (doc: OpenApiDoc): number => {
	let renamed = 0;
	const paths = doc.paths ?? {};
	const nextPaths: Record<string, PathItem> = {};

	for (const [pathTemplate, pathItem] of Object.entries(paths)) {
		let nextTemplate = pathTemplate;

		const rewriteParams = (params: Parameter[] | undefined) => {
			for (const param of params ?? []) {
				if (param.in !== "path" || !param.name) continue;
				const next = toJsIdent(param.name);
				if (next === param.name) continue;
				nextTemplate = nextTemplate.replaceAll(`{${param.name}}`, `{${next}}`);
				param.name = next;
				renamed += 1;
			}
		};

		rewriteParams(pathItem.parameters);
		for (const [method, op] of Object.entries(pathItem)) {
			if (!HTTP_METHODS.has(method) || !op || typeof op !== "object") continue;
			rewriteParams((op as Operation).parameters);
		}

		for (const param of pathItem.parameters ?? []) {
			if (param.in !== "path") renameParameter(param);
		}
		for (const [method, op] of Object.entries(pathItem)) {
			if (!HTTP_METHODS.has(method) || !op || typeof op !== "object") continue;
			for (const param of (op as Operation).parameters ?? []) {
				if (param.in !== "path") renameParameter(param);
			}
		}

		nextPaths[nextTemplate] = pathItem;
	}

	doc.paths = nextPaths;
	return renamed;
};

/** Always derive noun-verb ids from method+path (ignore upstream verb-noun ids). */
const assignOperationIds = (doc: OpenApiDoc): { assigned: number; deduped: number } => {
	const used = new Set<string>();
	let assigned = 0;
	let deduped = 0;

	for (const [pathTemplate, methods] of Object.entries(doc.paths ?? {})) {
		for (const [method, raw] of Object.entries(methods ?? {})) {
			if (!HTTP_METHODS.has(method) || !raw || typeof raw !== "object") continue;
			const op = raw as Operation;

			let id = synthesizeOperationId(method, pathTemplate);
			assigned += 1;

			if (used.has(id)) {
				const base = id;
				let n = 2;
				while (used.has(`${base}${n}`)) n += 1;
				id = `${base}${n}`;
				deduped += 1;
			}

			op.operationId = id;
			used.add(id);
		}
	}

	return { assigned, deduped };
};

const program = Effect.gen(function* () {
	const path = yield* Path.Path;
	const fs = yield* FileSystem.FileSystem;
	const http = yield* HttpClient.HttpClient;
	const crypto = yield* Crypto.Crypto;

	const filename = yield* path.fromFileUrl(new URL(import.meta.url));
	const scriptDir = path.dirname(filename);
	const outPath = path.join(scriptDir, "..", "spec", "netbird.api.json");

	const response = yield* http.get(specUrl).pipe(Effect.flatMap(HttpClientResponse.filterStatusOk));
	const yaml = yield* response.text;

	const digest = yield* crypto.digest("SHA-256", new TextEncoder().encode(yaml));
	const hash = toHex(digest);

	if (hash !== sha256) {
		return yield* Effect.fail(new Error(`Spec content hash mismatch for ${ref}: expected ${sha256}, got ${hash}`));
	}

	const doc = yield* Effect.sync(() => Yaml.parse(yaml) as OpenApiDoc);
	const renamedParams = normalizePathParamNames(doc);
	const { assigned, deduped } = assignOperationIds(doc);

	yield* fs.writeFileString(outPath, `${JSON.stringify(doc, null, "\t")}\n`);

	yield* Console.log(
		`Wrote ${outPath} (${ref}, sha256:${hash}, ${assigned} operationIds, ${deduped} deduped, ${renamedParams} path params renamed)`,
	);
});

program.pipe(
	Effect.provide(Layer.mergeAll(BunFileSystem.layer, BunPath.layer, BunHttpClient.layer, BunCrypto.layer)),
	BunRuntime.runMain,
);
