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
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import { readHomeInfraAxiom } from "../src/home-infra-state.ts";
import homeInfraStack from "../stack/home-infra.ts";
import type { HomeInfraAxiomOutput } from "../src/home-infra-stack.ts";

/**
 * Writes the Axiom ingest token and endpoint, HomeInfra outputs, into a host's
 * file in nix-secrets (`hosts/<host>.yaml`), where sops-nix installs them for
 * the host's otel-collector (`modules/nixos/otel-collector.nix`).
 *
 * Values reach sops on stdin, never as arguments: process listings would show
 * them. An existing file is updated in place, keeping its other keys; a new one
 * takes its recipients (the admins and the host) from `.sops.yaml`. Writing
 * needs the admin key (the YubiKey). Committing, locking and deploying are
 * left to the caller, as `connect-proxy.sh` leaves them.
 *
 * Run from the infra shell (`nix develop .#infra`), which provides sops.
 */

/** sops keys in `hosts/<host>.yaml`; `otel-collector.nix` declares them as `axiom/endpoint` and `axiom/ingest-token`. */
const KEYS = {
	endpoint: '["axiom"]["endpoint"]',
	token: '["axiom"]["ingest-token"]',
} as const;

const repoRoot = Effect.gen(function* () {
	const path = yield* Path.Path;
	return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");
});

/** The host's pinned SSH host key, from which its sops recipient is derived; none for an unknown or unpinned host. */
const hostKey = (host: string) =>
	Effect.gen(function* () {
		const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
		const cwd = yield* repoRoot;
		const stdout = yield* spawner
			.string(
				ChildProcess.make("nix", ["eval", "--json", `.#nixosConfigurations.${host}.config.hostInventory.ssh.hostKey`], {
					cwd,
					stderr: "ignore",
				}),
			)
			.pipe(Effect.orElseSucceed(() => "null"));
		return yield* Schema.decodeUnknownEffect(Schema.NullOr(Schema.String))(JSON.parse(stdout || "null"));
	});

const USER = Config.String("USER").pipe(
	Config.orElse(() => Config.String("USERNAME")),
	Config.withDefault("unknown"),
);

// Same precedence as the Alchemy CLI: `--stage`, then `$ALCHEMY_STAGE`, then `dev_${USER}`, where the stacks live.
const stageFlag = Flag.String("stage").pipe(
	Flag.withDescription("Alchemy stage of the HomeInfra stack (defaults to $ALCHEMY_STAGE or dev_${USER})"),
	Flag.optional,
	Flag.mapEffect(
		Effect.fn(function* (stage) {
			if (Option.isSome(stage)) return stage.value;
			const user = yield* USER.pipe(Effect.orDie);
			return yield* Config.String("ALCHEMY_STAGE").pipe(Config.withDefault(`dev_${user}`), Effect.orDie);
		}),
	),
);

const profileFlag = Flag.String("profile").pipe(
	Flag.withDescription("Alchemy auth profile (defaults to $ALCHEMY_PROFILE or 'default')"),
	Flag.optional,
	Flag.mapEffect(
		Effect.fn(function* (profile) {
			if (Option.isSome(profile)) return profile.value;
			return yield* Config.String("ALCHEMY_PROFILE").pipe(Config.withDefault("default"), Effect.orDie);
		}),
	),
);

const secretsFlag = Flag.Directory("secrets").pipe(
	Flag.withDescription("nix-secrets checkout (defaults to $NIX_SECRETS_DIR, or nix-secrets next to this repository)"),
	Flag.optional,
);

const dryRunFlag = Flag.Boolean("dry-run").pipe(
	Flag.withDescription("Read the outputs and check the host, but write nothing"),
	// A boolean flag left out fails unless it has a default.
	Flag.withDefault(false),
);

const hostArg = Argument.String("host").pipe(Argument.withDescription("Host running otel-collector (e.g. mars)"));

/** The HomeInfra stack's Axiom output, read from Alchemy state the way the CLI would reach it. */
const readOutput = (options: { readonly stage: string; readonly profile: string }) =>
	Effect.gen(function* () {
		if (!Effect.isEffect(homeInfraStack)) {
			return yield* Effect.die("stack/home-infra.ts must default-export an Alchemy stack effect");
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
		return yield* Effect.gen(function* () {
			const stack = yield* homeInfraStack;
			return yield* Effect.gen(function* () {
				const state = yield* yield* State.State;
				return yield* readHomeInfraAxiom(options.stage).pipe(
					Effect.provide(Layer.succeed(State.State, Effect.succeed(state))),
				);
			}).pipe(Effect.provide(stack.services));
		}).pipe(Effect.provide(services), Effect.scoped);
	});

const encode = (value: unknown) => Stream.make(new TextEncoder().encode(JSON.stringify(value)));

/** Writes the two keys into `hosts/<host>.yaml`, creating the file from `.sops.yaml` if it is new. */
const store = (secretsDir: string, host: string, axiom: HomeInfraAxiomOutput) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;
		const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
		const file = `hosts/${host}.yaml`;
		const values = { endpoint: axiom.endpoint, token: Redacted.value(axiom.token) };

		if (yield* fs.exists(path.join(secretsDir, file))) {
			for (const [key, value] of [
				[KEYS.endpoint, values.endpoint],
				[KEYS.token, values.token],
			] as const) {
				const exitCode = yield* spawner.exitCode(
					ChildProcess.make("sops", ["set", "--value-stdin", file, key], {
						cwd: secretsDir,
						stdin: encode(value),
						stdout: "inherit",
						stderr: "inherit",
					}),
				);
				if (exitCode !== 0) return yield* Effect.die(`sops set ${file} ${key} exited with ${exitCode}`);
			}
			return;
		}

		const encrypted = yield* spawner.string(
			ChildProcess.make(
				"sops",
				["--encrypt", "--filename-override", file, "--input-type", "json", "--output-type", "yaml", "/dev/stdin"],
				{
					cwd: secretsDir,
					stdin: encode({ axiom: { endpoint: values.endpoint, "ingest-token": values.token } }),
					stderr: "inherit",
				},
			),
		);
		if (encrypted.trim() === "") return yield* Effect.die(`sops wrote nothing for ${file}`);
		yield* fs.writeFileString(path.join(secretsDir, file), encrypted, { mode: 0o600 });
	});

const connectAxiom = Command.make("connect-axiom", {
	host: hostArg,
	stage: stageFlag,
	profile: profileFlag,
	secrets: secretsFlag,
	dryRun: dryRunFlag,
}).pipe(
	Command.withDescription("Write the Axiom ingest token and endpoint into a host's file in nix-secrets"),
	Command.withHandler(
		Effect.fn(function* ({ host, stage, profile, secrets, dryRun }) {
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			const root = yield* repoRoot;
			const secretsDir = Option.isSome(secrets)
				? secrets.value
				: yield* Config.String("NIX_SECRETS_DIR").pipe(Config.withDefault(path.join(root, "..", "nix-secrets")));

			if ((yield* hostKey(host)) === null) {
				return yield* Effect.die(
					`${host} is not a NixOS host with a pinned SSH host key; sops-nix could not decrypt for it`,
				);
			}
			if (!(yield* fs.exists(path.join(secretsDir, ".sops.yaml")))) {
				return yield* Effect.die(`${secretsDir} is not a nix-secrets checkout (pass --secrets DIR)`);
			}

			const axiom = yield* readOutput({ stage, profile });
			yield* Console.log(`dataset ${axiom.dataset} at ${axiom.endpoint}`);
			if (dryRun) {
				yield* Console.log(`would write ${KEYS.endpoint} and ${KEYS.token} into ${secretsDir}/hosts/${host}.yaml`);
				return;
			}

			yield* store(secretsDir, host, axiom);
			yield* Console.log(
				[
					`stored the Axiom endpoint and ingest token in ${secretsDir}/hosts/${host}.yaml. To install them:`,
					"  1. commit and push nix-secrets",
					`  2. nix flake update secrets --refresh, commit, and deploy ${host}`,
				].join("\n"),
			);
		}),
	),
);

const program = Command.run(connectAxiom, { version: "0.0.0" }).pipe(
	Effect.provide(NodeServices.layer),
	Effect.scoped,
	Effect.orDie,
);

NodeRuntime.runMain(program as Effect.Effect<void>);
