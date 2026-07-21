import * as BunCrypto from "@effect/platform-bun/BunCrypto";
import { havePropsChanged, isResolved } from "alchemy/Diff";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import { RuntimeContext } from "alchemy/RuntimeContext";
import { Stack } from "alchemy/Stack";
import { isResourceState } from "alchemy/State";
import * as State from "alchemy/State";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Encoding from "effect/Encoding";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as ChildProcess from "effect/unstable/process/ChildProcess";
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner";

export interface NixExprProps {
	/**
	 * Working directory.
	 */
	cwd: string;
	/**
	 * Nix flake expression to evaluate (e.g. `.#me`).
	 */
	expression: string;
}

interface NixExprAttributes {
	value: unknown;
	hash: {
		input: string | undefined;
	};
}

export interface NixExpr extends Resource<"NixExpr", NixExprProps, NixExprAttributes> {}

export const NixExpr = Resource<NixExpr>("NixExpr");

const hashJson = (json: string) =>
	Effect.gen(function* () {
		const crypto = yield* Crypto.Crypto;
		const digest = yield* crypto.digest("SHA-256", new TextEncoder().encode(json));
		return Encoding.encodeHex(digest);
	});

const HASH_APPLY = 'x: builtins.hashString "sha256" (builtins.toJSON x)';

const hashExpression = (props: NixExprProps) =>
	Effect.gen(function* () {
		const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
		return yield* spawner
			.string(
				ChildProcess.make("nix", ["eval", "--raw", props.expression, "--apply", HASH_APPLY], {
					cwd: props.cwd,
					extendEnv: true,
				}),
			)
			.pipe(Effect.map(stdout => stdout.trim()));
	});

const evalProps = (props: NixExprProps) =>
	Effect.gen(function* () {
		const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
		const stdout = yield* spawner.string(
			ChildProcess.make("nix", ["eval", "--json", props.expression], {
				cwd: props.cwd,
				extendEnv: true,
			}),
		);
		const json = stdout.trim();
		return {
			json,
			value: JSON.parse(json) as unknown,
		};
	});

/**
 * Decode a {@link NixExpr} output with a schema.
 *
 * Prefer resolving through the resource output (`yield* expr.value`) when
 * {@link RuntimeContext} is available (e.g. inside Actions). During stack
 * planning/destroy, fall back to persisted state or the same `nix eval` path
 * the provider uses on first deploy.
 */
export const decode = <A>(expr: NixExpr, schema: Schema.Schema<A>) =>
	Effect.gen(function* () {
		const runtime = yield* Effect.serviceOption(RuntimeContext);
		if (Option.isSome(runtime)) {
			const value = yield* expr.value;
			return yield* Schema.decodeUnknownEffect(schema)(value).pipe(Effect.orDie);
		}

		const state = yield* yield* State.State;
		const stack = yield* Stack;
		const row = yield* state.get({
			stack: stack.name,
			stage: stack.stage,
			fqn: expr.FQN,
		});
		if (isResourceState(row) && row.attr !== undefined) {
			const value = (row.attr as NixExprAttributes).value;
			return yield* Schema.decodeUnknownEffect(schema)(value).pipe(Effect.orDie);
		}

		const value = yield* evalProps(expr.Props).pipe(Effect.map(({ value }) => value));
		return yield* Schema.decodeUnknownEffect(schema)(value).pipe(Effect.orDie);
	}).pipe(Effect.orDie);

export const NixExprProvider = () =>
	Provider.succeed(NixExpr, {
		list: () => Effect.succeed([]),
		diff: Effect.fn(function* ({ olds, news, output }) {
			const attrs = output as NixExprAttributes | undefined;
			if (!attrs || !isResolved(news)) {
				return undefined;
			}

			if (!attrs.hash.input) {
				return { action: "update" };
			}

			if (havePropsChanged(olds, news)) {
				return { action: "update" };
			}

			const newHash = yield* hashExpression(news);
			return {
				action: newHash === attrs.hash.input ? "noop" : "update",
			};
		}),
		reconcile: Effect.fn(function* ({ news }) {
			if (!isResolved(news)) {
				return yield* Effect.die("NixExpr props must be resolved before reconcile");
			}

			const { json, value } = yield* evalProps(news);
			const hash = yield* hashJson(json);

			return {
				value,
				hash: {
					input: hash,
				},
			} satisfies NixExprAttributes;
		}),
		delete: () => Effect.void,
	}).pipe(Layer.provide(BunCrypto.layer));
