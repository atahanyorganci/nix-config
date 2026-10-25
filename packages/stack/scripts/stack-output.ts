import { AlchemyContextLive } from "alchemy/AlchemyContext";
import { ArtifactStore, createArtifactStore } from "alchemy/Artifacts";
import { AuthProviders } from "alchemy/Auth/AuthProvider";
import { ProfileStoreLive } from "alchemy/Auth/Profile";
import { withProfileOverride } from "alchemy/Auth/Resolve";
import { Stage } from "alchemy/Stage";
import * as State from "alchemy/State";
import { StackConfigOverrides } from "alchemy/Util/ConfigProvider";
import { PlatformServices } from "alchemy/Util/PlatformServices";
import * as Flag from "effect/cli/Flag";
import * as Config from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as Redacted from "effect/Redacted";
import homeInfraStack from "../stack/home-infra.ts";
import netbirdServerStack from "../stack/netbird-server.ts";

/**
 * Reading the stacks' outputs from Alchemy state, for the scripts that hand
 * them on (`store-secret`, `netbird-token`).
 */

/** Stacks whose outputs can be read, by the name their state is stored under. */
export const STACKS = {
	HomeInfra: homeInfraStack,
	NetbirdServer: netbirdServerStack,
} as const;
export type StackName = keyof typeof STACKS;
export const STACK_NAMES = Object.keys(STACKS) as ReadonlyArray<StackName>;

const USER = Config.String("USER").pipe(
	Config.orElse(() => Config.String("USERNAME")),
	Config.withDefault("unknown"),
);

// Same precedence as the Alchemy CLI: `--stage`, then `$ALCHEMY_STAGE`, then `dev_${USER}`, where the stacks live.
export const stageFlag = Flag.String("stage").pipe(
	Flag.withDescription("Alchemy stage of the stack (defaults to $ALCHEMY_STAGE or dev_${USER})"),
	Flag.withFallbackConfig(
		Config.String("ALCHEMY_STAGE").pipe(Config.orElse(() => USER.pipe(Config.map(user => `dev_${user}`)))),
	),
);

export const profileFlag = Flag.String("profile").pipe(
	Flag.withDescription("Alchemy auth profile (defaults to $ALCHEMY_PROFILE or 'default')"),
	Flag.withFallbackConfig(Config.String("ALCHEMY_PROFILE").pipe(Config.withDefault("default"))),
);

/** The stack's output in Alchemy state, read the way the CLI would reach it. */
export const readStackOutput = (name: StackName, options: { readonly stage: string; readonly profile: string }) =>
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
export const lookup = (stack: StackName, output: unknown, path: ReadonlyArray<string>) =>
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
