import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import { Hex } from "effect/encoding";
import * as ChildProcess from "effect/process/ChildProcess";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";
import * as Schema from "effect/Schema";
import * as NodePath from "node:path";

// Read once: tools that spawn processes may `chdir` transiently, and a live
// read racing that would resolve against an unrelated directory.
const initialCwd = process.cwd();

/** Resolve a flake root; a relative path resolves against the working directory. */
export const resolveFlakeRoot = (flakeRoot: string) => NodePath.resolve(initialCwd, flakeRoot);

const HASH_APPLY = 'x: builtins.hashString "sha256" (builtins.toJSON x)';

/** Run `nix eval` on an attribute path of a flake's outputs. */
const nixEval = (flakeRoot: string, attr: string, ...args: string[]) =>
	Effect.gen(function* () {
		const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
		const stdout = yield* spawner.string(
			ChildProcess.make("nix", ["eval", `.#${attr}`, ...args], {
				cwd: resolveFlakeRoot(flakeRoot),
				extendEnv: true,
			}),
		);
		return stdout.trim();
	});

export const evalRaw = (flakeRoot: string, attr: string) => nixEval(flakeRoot, attr, "--raw");

export const evalJson = (flakeRoot: string, attr: string) =>
	nixEval(flakeRoot, attr, "--json").pipe(
		Effect.flatMap(json =>
			Schema.decodeEffect(Schema.fromJsonString(Schema.Unknown))(json).pipe(Effect.map(value => ({ json, value }))),
		),
	);

/** The SHA-256 of an attribute's JSON, computed by Nix so nothing else is serialised. */
export const evalHash = (flakeRoot: string, attr: string) => nixEval(flakeRoot, attr, "--raw", "--apply", HASH_APPLY);

/** Matches {@link evalHash} for the output of {@link evalJson}. */
export const hashJson = (json: string) =>
	Effect.gen(function* () {
		const crypto = yield* Crypto.Crypto;
		const digest = yield* crypto.digest("SHA-256", new TextEncoder().encode(json));
		return Hex.encode(digest);
	});
