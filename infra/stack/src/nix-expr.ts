import { CommandExecutor, CommandExecutorLive } from "alchemy/Command";
import { hashDirectory, type MemoOptions } from "alchemy/Command/Memo";
import { havePropsChanged, isResolved } from "alchemy/Diff";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

export interface NixExprProps<A> {
	/**
	 * Name of the expression.
	 */
	name: string;
	/**
	 * Working directory.
	 */
	cwd: string;
	/**
	 * Files to include in the memoization. Relative to `cwd`.
	 */
	include: string[];
	/**
	 * Nix flake expression to evaluate (e.g. `.#me`).
	 */
	expression: string;
	/**
	 * Schema used to decode the JSON emitted on stdout.
	 */
	schema: Schema.Schema<A>;
	/**
	 * Memoization options. Defaults to `{ include }`.
	 */
	memo?: MemoOptions | boolean;
}

interface NixExprResourceProps {
	cwd: string;
	include: string[];
	expression: string;
	memo?: MemoOptions | boolean;
}

interface NixExprAttributes<A = unknown> {
	value: A;
	hash: {
		input: string | undefined;
	};
}

export interface NixExpr extends Resource<"NixExpr", NixExprResourceProps, NixExprAttributes> {}

const NixExprResource = Resource<NixExpr>("NixExpr");

const schemas = new Map<string, Schema.Schema<any>>();

const resolveMemo = ({ include, memo }: NixExprResourceProps): MemoOptions | false => {
	if (memo === false) {
		return false;
	}
	if (memo === undefined || memo === true) {
		return { include };
	}
	return { ...memo, include: memo.include ?? include };
};

const hashInputs = Effect.fn(function* (props: NixExprResourceProps) {
	const memo = resolveMemo(props);
	if (memo === false) {
		return undefined;
	}
	return yield* hashDirectory({ cwd: props.cwd, memo });
});

export const NixExprProvider = (): Layer.Layer<Provider.Provider<NixExpr>> =>
	Provider.effect(
		NixExprResource as never,
		Effect.gen(function* () {
			const { run } = yield* CommandExecutor;

			return {
				list: () => Effect.succeed([]),
				diff: Effect.fn(function* ({ olds, news, output }) {
					const attrs = output as NixExprAttributes | undefined;
					if (!attrs || !isResolved(news)) {
						return undefined;
					}

					if (news.memo === false || !attrs.hash.input) {
						return { action: "update" };
					}

					if (havePropsChanged(olds, news)) {
						return { action: "update" };
					}

					const newHash = yield* hashInputs(news);
					return {
						action: newHash === attrs.hash.input ? "noop" : "update",
					};
				}),
				reconcile: Effect.fn(function* ({ id, news, session }) {
					const schema = schemas.get(id);
					if (!schema) {
						return yield* Effect.die(`No schema registered for NixExpr "${id}"`);
					}

					const command = `nix eval --json ${news.expression}`;
					const { stdout } = yield* run({ command, cwd: news.cwd }, session);
					const decode = Schema.decodeEffect(Schema.fromJsonString(schema));
					const value = yield* decode(stdout.trim());

					return {
						value,
						hash: {
							input: yield* hashInputs(news),
						},
					} satisfies NixExprAttributes;
				}),
				delete: () => Effect.void,
			};
		}),
	).pipe(Layer.provide(CommandExecutorLive())) as unknown as Layer.Layer<Provider.Provider<NixExpr>>;

export const make = <A>({ name, schema, cwd, include, expression, memo }: NixExprProps<A>) => {
	schemas.set(name, schema);
	const props = memo === undefined ? { cwd, include, expression } : { cwd, include, expression, memo };
	return NixExprResource(name, props) as Effect.Effect<NixExpr & NixExprAttributes<A>>;
};
