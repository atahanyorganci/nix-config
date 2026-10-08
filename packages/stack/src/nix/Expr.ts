import { havePropsChanged, isResolved } from "alchemy/Diff";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import { RuntimeContext } from "alchemy/RuntimeContext";
import { Stack } from "alchemy/Stack";
import { isResourceState } from "alchemy/State";
import * as State from "alchemy/State";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { evalHash, evalJson, hashJson } from "./eval.ts";

export interface ExprProps {
	/** Path to the flake; a relative path resolves against the working directory. */
	flakeRoot: string;
	/** Attribute path of the flake's outputs to evaluate (e.g. `packages.x86_64-linux.default.name`). */
	attr: string;
}

interface ExprAttributes {
	value: unknown;
	hash: {
		input: string | undefined;
	};
}

export interface Expr extends Resource<"Nix.Expr", ExprProps, ExprAttributes> {}

/**
 * A flake attribute's value, recorded in state with its hash. Planning
 * re-evaluates only the hash, and the resource updates when it changes.
 */
export const Expr = Resource<Expr>("Nix.Expr");

/**
 * Evaluate a flake attribute and decode it with a schema, without recording
 * it as a resource.
 *
 * Use this for values that only feed other resources' props: the value is
 * persisted through those props, so a change shows up only on the resources
 * it actually reaches, and fields the schema does not keep cannot cause churn.
 * An {@link Expr} resource would instead report its own update for any
 * change to the whole attribute.
 */
export const evaluate = <A>({ flakeRoot, attr }: ExprProps, schema: Schema.Schema<A>) =>
	evalJson(flakeRoot, attr).pipe(
		Effect.flatMap(({ value }) => Schema.decodeUnknownEffect(schema)(value)),
		Effect.orDie,
	);

/**
 * Decode an {@link Expr} output with a schema.
 *
 * Prefer resolving through the resource output (`yield* expr.value`) when
 * {@link RuntimeContext} is available (e.g. inside Actions). During stack
 * planning/destroy, fall back to persisted state or the same `nix eval` path
 * the provider uses on first deploy.
 *
 * Persisted state is only reused when its content hash still matches a live
 * `nix eval` hash — otherwise planning would build resources from a stale
 * value while the Expr resource itself is only marked for update.
 *
 * If the cached value no longer matches the schema (e.g. flake output gained
 * a required field), re-evaluate the attribute live so planning can proceed
 * and the next reconcile can persist the updated value.
 */
export const decode = <A>(expr: Expr, schema: Schema.Schema<A>) =>
	Effect.gen(function* () {
		const tryDecode = (value: unknown) => Schema.decodeUnknownEffect(schema)(value).pipe(Effect.option);

		const runtime = yield* Effect.serviceOption(RuntimeContext);
		if (Option.isSome(runtime)) {
			const value = yield* expr.value;
			const decoded = yield* tryDecode(value);
			if (Option.isSome(decoded)) return decoded.value;
		} else {
			const state = yield* yield* State.State;
			const stack = yield* Stack;
			const row = yield* state.get({
				stack: stack.name,
				stage: stack.stage,
				fqn: expr.FQN,
			});
			if (isResourceState(row) && row.attr !== undefined) {
				const attrs = row.attr as ExprAttributes;
				const liveHash = yield* evalHash(expr.Props.flakeRoot, expr.Props.attr).pipe(Effect.option);
				const cacheFresh =
					Option.isSome(liveHash) && attrs.hash.input !== undefined && attrs.hash.input === liveHash.value;
				if (cacheFresh) {
					const decoded = yield* tryDecode(attrs.value);
					if (Option.isSome(decoded)) return decoded.value;
				}
			}
		}

		const { value } = yield* evalJson(expr.Props.flakeRoot, expr.Props.attr);
		return yield* Schema.decodeUnknownEffect(schema)(value).pipe(Effect.orDie);
	}).pipe(Effect.orDie);

export const ExprProvider = () =>
	Provider.succeed(Expr, {
		list: () => Effect.succeed([]),
		diff: Effect.fn(function* ({ olds, news, output }) {
			if (!output || !isResolved(news)) {
				return undefined;
			}
			if (!output.hash.input || havePropsChanged(olds, news)) {
				return { action: "update" };
			}
			const hash = yield* evalHash(news.flakeRoot, news.attr);
			return { action: hash === output.hash.input ? "noop" : "update" };
		}),
		reconcile: Effect.fn(function* ({ news }) {
			if (!isResolved(news)) {
				return yield* Effect.die("Nix.Expr props must be resolved before reconcile");
			}
			const { json, value } = yield* evalJson(news.flakeRoot, news.attr);
			return { value, hash: { input: yield* hashJson(json) } } satisfies ExprAttributes;
		}),
		delete: () => Effect.void,
	});
