import { NodeRuntime } from "@effect/platform-node";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { AlchemyContextLive } from "alchemy/AlchemyContext";
import { ArtifactStore, createArtifactStore } from "alchemy/Artifacts";
import { AuthProviders } from "alchemy/Auth/AuthProvider";
import { ProfileStoreLive } from "alchemy/Auth/Profile";
import { withProfileOverride } from "alchemy/Auth/Resolve";
import { Stage } from "alchemy/Stage";
import * as State from "alchemy/State";
import { StackConfigOverrides } from "alchemy/Util/ConfigProvider";
import { PlatformServices } from "alchemy/Util/PlatformServices";
import * as Argument from "effect/cli/Argument";
import * as Command from "effect/cli/Command";
import * as Flag from "effect/cli/Flag";
import * as Config from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as Path from "effect/Path";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Stdio from "effect/Stdio";
import * as Stream from "effect/Stream";
import homeInfraStack from "../stack/home-infra.ts";
import netbirdServerStack from "../stack/netbird-server.ts";

/**
 * Writes values into a host's file in nix-secrets (`hosts/<host>.yaml`), where
 * sops-nix installs them for the host. A value comes from a stack's output in
 * Alchemy state, by its path, or from stdin:
 *
 *   store-secret mars axiom/endpoint axiom/ingest-token=axiom/token
 *   create-proxy-token mars-proxy | cut -f2- | store-secret mars netbird-proxy/token=-
 *
 * Each `key[=source]` names the sops-nix key (`sops.secrets."<key>"`) and where
 * its value comes from: a `/`-separated path into the stack's output (the key
 * itself when left out), or `-` for stdin. Values reach sops on stdin, never as
 * arguments, and are never printed: process listings and terminals would show
 * them.
 *
 * An existing file is updated in place, keeping its other keys; a new one takes
 * its recipients (the admins and the host) from `.sops.yaml`. Writing needs the
 * admin key (the YubiKey). Committing, locking and deploying are left to the
 * caller.
 *
 * The nix-secrets checkout is `--secrets DIR` or `$NIX_SECRETS_DIR`; there is
 * no default location. Run from the infra shell (`nix develop .#infra`), which
 * provides sops.
 */

/** Stacks whose outputs can be read, by the name their state is stored under. */
const STACKS = {
	HomeInfra: homeInfraStack,
	NetbirdServer: netbirdServerStack,
} as const;
type StackName = keyof typeof STACKS;
const STACK_NAMES = Object.keys(STACKS) as ReadonlyArray<StackName>;

type Source = { readonly _tag: "Output"; readonly path: ReadonlyArray<string> } | { readonly _tag: "Stdin" };

interface Mapping {
	/** The sops-nix key, split on `/`. */
	readonly key: ReadonlyArray<string>;
	readonly source: Source;
}

const repoRoot = Effect.gen(function* () {
	const path = yield* Path.Path;
	return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");
});

const USER = Config.String("USER").pipe(
	Config.orElse(() => Config.String("USERNAME")),
	Config.withDefault("unknown"),
);

// Same precedence as the Alchemy CLI: `--stage`, then `$ALCHEMY_STAGE`, then `dev_${USER}`, where the stacks live.
const stageFlag = Flag.String("stage").pipe(
	Flag.withDescription("Alchemy stage of the stack (defaults to $ALCHEMY_STAGE or dev_${USER})"),
	Flag.withFallbackConfig(
		Config.String("ALCHEMY_STAGE").pipe(Config.orElse(() => USER.pipe(Config.map(user => `dev_${user}`)))),
	),
);

const profileFlag = Flag.String("profile").pipe(
	Flag.withDescription("Alchemy auth profile (defaults to $ALCHEMY_PROFILE or 'default')"),
	Flag.withFallbackConfig(Config.String("ALCHEMY_PROFILE").pipe(Config.withDefault("default"))),
);

const stackFlag = Flag.Literals("stack", STACK_NAMES).pipe(
	Flag.withDescription("Stack whose output the paths point into"),
	Flag.withDefault("HomeInfra" as const),
);

const secretsFlag = Flag.Directory("secrets").pipe(
	Flag.withDescription("nix-secrets checkout (defaults to $NIX_SECRETS_DIR)"),
	Flag.withFallbackConfig(Config.String("NIX_SECRETS_DIR")),
);

const dryRunFlag = Flag.Boolean("dry-run").pipe(
	Flag.withDescription("Resolve every value and check the host, but read no stdin and write nothing"),
	// A boolean flag left out fails unless it has a default.
	Flag.withDefault(false),
);

const hostArg = Argument.String("host").pipe(Argument.withDescription("Host the secrets are for (e.g. mars)"));

const secretsArg = Argument.String("secret").pipe(
	Argument.withDescription(
		"key[=path|-]: the sops-nix key (e.g. axiom/ingest-token) and its value's path in the stack's output (defaults to the key), or - for stdin",
	),
	Argument.variadic({ min: 1 }),
);

const segments = (what: string, value: string) =>
	Effect.gen(function* () {
		const parts = value.split("/");
		if (parts.some(part => part === "")) {
			return yield* Effect.die(`${what} "${value}" has an empty segment`);
		}
		return parts;
	});

/** Parses `key[=path|-]` arguments, rejecting keys that would overwrite each other. */
const parseMappings = (args: ReadonlyArray<string>) =>
	Effect.gen(function* () {
		const mappings: Array<Mapping> = [];
		for (const arg of args) {
			const eq = arg.indexOf("=");
			const key = yield* segments("key", eq === -1 ? arg : arg.slice(0, eq));
			const source = eq === -1 ? key.join("/") : arg.slice(eq + 1);
			mappings.push({
				key,
				source: source === "-" ? { _tag: "Stdin" } : { _tag: "Output", path: yield* segments("path", source) },
			});
		}

		if (mappings.filter(mapping => mapping.source._tag === "Stdin").length > 1) {
			return yield* Effect.die("only one key can be read from stdin");
		}
		for (const [i, a] of mappings.entries()) {
			for (const b of mappings.slice(i + 1)) {
				const [short, long] = a.key.length <= b.key.length ? [a.key, b.key] : [b.key, a.key];
				if (short.every((part, j) => long[j] === part)) {
					return yield* Effect.die(`keys ${short.join("/")} and ${long.join("/")} overlap`);
				}
			}
		}
		return mappings;
	});

/** The host's pinned SSH host key, from which its sops recipient is derived; none for an unknown or unpinned host. */
const hostKey = (host: string) =>
	Effect.gen(function* () {
		const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
		const cwd = yield* repoRoot;
		for (const configurations of ["nixosConfigurations", "darwinConfigurations"]) {
			const stdout = yield* spawner
				.string(
					ChildProcess.make("nix", ["eval", "--json", `.#${configurations}.${host}.config.hostInventory.ssh.hostKey`], {
						cwd,
						stderr: "ignore",
					}),
				)
				.pipe(Effect.orElseSucceed(() => "null"));
			const key = yield* Schema.decodeUnknownEffect(Schema.NullOr(Schema.String))(JSON.parse(stdout || "null"));
			if (key !== null) return key;
		}
		return null;
	});

/** The stack's output in Alchemy state, read the way the CLI would reach it. */
const readStackOutput = (name: StackName, options: { readonly stage: string; readonly profile: string }) =>
	Effect.gen(function* () {
		const stackEffect = STACKS[name];
		if (!Effect.isEffect(stackEffect)) {
			return yield* Effect.die(`the ${name} stack module must default-export an Alchemy stack effect`);
		}
		const services = Layer.mergeAll(
			Layer.provideMerge(AlchemyContextLive, PlatformServices),
			Layer.provide(ProfileStoreLive, PlatformServices),
			Layer.succeed(ArtifactStore, createArtifactStore()),
			Layer.succeed(AuthProviders, {}),
			ConfigProvider.layer(withProfileOverride(ConfigProvider.fromEnv(), options.profile)),
			// A stack with `secrets` takes `ALCHEMY_PROFILE` only from here (the CLI's
			// `--profile`) or the real process environment, never from config.
			Layer.succeed(StackConfigOverrides, { profile: options.profile }),
			Logger.layer([], { mergeWithExisting: true }),
			Layer.succeed(Stage, options.stage),
			FetchHttpClient.layer,
		);
		const output = yield* Effect.gen(function* () {
			const stack = yield* stackEffect;
			return yield* Effect.gen(function* () {
				const state = yield* yield* State.State;
				return yield* state.getOutput({ stack: name, stage: options.stage });
			}).pipe(Effect.provide(stack.services));
		}).pipe(Effect.provide(services), Effect.scoped);
		if (output == null) {
			return yield* Effect.die(`${name} has no output for stage "${options.stage}"; deploy it first`);
		}
		return output;
	});

const describeKeys = (value: object) => {
	const keys = Object.keys(value);
	return keys.length === 0 ? "nothing" : keys.join(", ");
};

/**
 * The value at `path` in a stack's output. State revives secrets as `Redacted`,
 * at any depth, so each step unwraps one before looking inside it; whether one
 * was met is kept, for display.
 */
const lookup = (stack: StackName, output: unknown, path: ReadonlyArray<string>) =>
	Effect.gen(function* () {
		let value = output;
		let redacted = false;
		const unwrap = () => {
			while (Redacted.isRedacted(value)) {
				value = Redacted.value(value);
				redacted = true;
			}
		};
		for (const [i, segment] of path.entries()) {
			unwrap();
			const at = path.slice(0, i).join("/") || "the top level";
			if (typeof value !== "object" || value === null) {
				return yield* Effect.die(`${stack} output has nothing under ${path.join("/")}: ${at} is a ${typeof value}`);
			}
			if (!Object.hasOwn(value, segment)) {
				return yield* Effect.die(
					`${stack} output has no ${path.slice(0, i + 1).join("/")}; ${at} has ${describeKeys(value)}`,
				);
			}
			value = (value as Record<string, unknown>)[segment];
		}
		unwrap();
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			return { value: String(value), redacted };
		}
		if (typeof value === "object" && value !== null) {
			return yield* Effect.die(
				`${stack} output ${path.join("/")} is not a single value; pick one of ${describeKeys(value)}`,
			);
		}
		return yield* Effect.die(`${stack} output ${path.join("/")} is ${value === null ? "null" : typeof value}`);
	});

const readStdin = (key: string) =>
	Effect.gen(function* () {
		const stdio = yield* Stdio.Stdio;
		if (yield* stdio.stdinIsTerminal) {
			return yield* Effect.die(`${key} is read from stdin; pipe its value in`);
		}
		const text = yield* stdio.stdin.pipe(Stream.decodeText(), Stream.mkString);
		const value = text.endsWith("\r\n") ? text.slice(0, -2) : text.endsWith("\n") ? text.slice(0, -1) : text;
		if (value === "") return yield* Effect.die(`stdin was empty; no value for ${key}`);
		return value;
	});

const encode = (value: unknown) => Stream.make(new TextEncoder().encode(JSON.stringify(value)));

/** sops's index syntax for a key: `a/b-c` -> `["a"]["b-c"]`. */
const sopsIndex = (key: ReadonlyArray<string>) => key.map(part => `[${JSON.stringify(part)}]`).join("");

/** Writes the values into `hosts/<host>.yaml`, creating the file from `.sops.yaml` if it is new. */
const store = (secretsDir: string, host: string, values: ReadonlyArray<readonly [ReadonlyArray<string>, string]>) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;
		const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
		const file = `hosts/${host}.yaml`;
		const target = path.join(secretsDir, file);

		if (yield* fs.exists(target)) {
			for (const [key, value] of values) {
				const exitCode = yield* spawner.exitCode(
					ChildProcess.make("sops", ["set", "--value-stdin", file, sopsIndex(key)], {
						cwd: secretsDir,
						stdin: encode(value),
						stdout: "inherit",
						stderr: "inherit",
					}),
				);
				if (exitCode !== 0) return yield* Effect.die(`sops set ${file} ${key.join("/")} exited with ${exitCode}`);
			}
			return;
		}

		// The keys do not overlap (`parseMappings`), so each lands in its own place.
		const tree: Record<string, unknown> = {};
		for (const [key, value] of values) {
			let node = tree;
			for (const part of key.slice(0, -1)) node = (node[part] ??= {}) as Record<string, unknown>;
			node[key[key.length - 1]!] = value;
		}
		const encrypted = yield* spawner.string(
			ChildProcess.make(
				"sops",
				["--encrypt", "--filename-override", file, "--input-type", "json", "--output-type", "yaml", "/dev/stdin"],
				{ cwd: secretsDir, stdin: encode(tree), stderr: "inherit" },
			),
		);
		if (encrypted.trim() === "") return yield* Effect.die(`sops wrote nothing for ${file}`);
		const tmp = `${target}.tmp`;
		yield* fs.writeFileString(tmp, encrypted, { mode: 0o600 });
		yield* fs.rename(tmp, target).pipe(Effect.onError(() => fs.remove(tmp).pipe(Effect.ignore)));
	});

const storeSecret = Command.make("store-secret", {
	host: hostArg,
	secrets: secretsArg,
	stack: stackFlag,
	stage: stageFlag,
	profile: profileFlag,
	secretsDir: secretsFlag,
	dryRun: dryRunFlag,
}).pipe(
	Command.withDescription("Write stack outputs, or a value on stdin, into a host's file in nix-secrets"),
	Command.withHandler(
		Effect.fn(function* ({ host, secrets, stack, stage, profile, secretsDir: secretsDirArg, dryRun }) {
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
			const secretsDir = path.resolve(secretsDirArg);
			const file = path.join(secretsDir, "hosts", `${host}.yaml`);

			// Everything that can fail without touching a secret goes first, so a
			// caller can run `--dry-run` before minting a value it would lose.
			const mappings = yield* parseMappings(secrets);
			if ((yield* hostKey(host)) === null) {
				return yield* Effect.die(`${host} is not a host with a pinned SSH host key; sops-nix could not decrypt for it`);
			}
			if (!(yield* fs.exists(path.join(secretsDir, ".sops.yaml")))) {
				return yield* Effect.die(`${secretsDir} is not a nix-secrets checkout (pass --secrets DIR)`);
			}
			const sops = yield* spawner
				.exitCode(ChildProcess.make("sops", ["--version"], { stdout: "ignore", stderr: "ignore" }))
				.pipe(Effect.orElseSucceed(() => -1));
			if (sops !== 0) return yield* Effect.die("sops not found; run from the infra shell (nix develop .#infra)");

			const output = mappings.some(mapping => mapping.source._tag === "Output")
				? yield* readStackOutput(stack, { stage, profile })
				: undefined;
			const resolved = yield* Effect.forEach(mappings, mapping =>
				Effect.gen(function* () {
					const key = mapping.key.join("/");
					if (mapping.source._tag === "Stdin") {
						return { mapping, from: "stdin", value: dryRun ? undefined : yield* readStdin(key) };
					}
					const found = yield* lookup(stack, output, mapping.source.path);
					return {
						mapping,
						from: `${stack}:${mapping.source.path.join("/")} (${found.redacted ? "redacted" : "plain"})`,
						value: found.value,
					};
				}),
			);

			for (const { mapping, from } of resolved) {
				yield* Console.log(`${mapping.key.join("/")} <- ${from}`);
			}
			if (dryRun) {
				yield* Console.log(`would write ${resolved.length} key(s) into ${file}`);
				return;
			}

			yield* store(
				secretsDir,
				host,
				resolved.map(({ mapping, value }) => [mapping.key, value!] as const),
			);
			yield* Console.log(
				[
					`stored ${resolved.length} key(s) in ${file}. To install them:`,
					"  1. commit and push nix-secrets",
					`  2. nix flake update secrets --refresh, commit, and deploy ${host}`,
				].join("\n"),
			);
		}),
	),
);

Command.run(storeSecret, { version: "0.0.0" }).pipe(
	Effect.provide(NodeServices.layer),
	Effect.scoped,
	Effect.orDie,
	NodeRuntime.runMain,
);
