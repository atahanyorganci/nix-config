import * as Command from "alchemy/Command";
import { havePropsChanged, isResolved } from "alchemy/Diff";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import * as Effect from "effect/Effect";
import { evalRaw, resolveFlakeRoot } from "./eval.ts";

export interface NixOSProps extends Omit<Command.CommandRunProps, "cwd"> {
	/** Path to the flake; a relative path resolves against the working directory. */
	flakeRoot: string;
	/** Name of the configuration under the flake's `nixosConfigurations`. */
	configuration: string;
	/**
	 * Command that switches the host to the configuration. It runs in the
	 * flake root and receives the evaluated system's store path as
	 * `NIXOS_SYSTEM`, so it can refuse to deploy any other.
	 *
	 * @example "nixos-rebuild switch --flake .#web --target-host root@203.0.113.7"
	 */
	command: string;
	/**
	 * Values the deploy depends on without using, such as the provisioning of
	 * its host: it waits for them, and runs again when they change.
	 */
	after?: unknown;
}

interface NixOSAttributes {
	/**
	 * The system last deployed: the configuration's `toplevel.outPath`. It
	 * changes exactly when the host's closure does, not for flake changes that
	 * do not reach it.
	 */
	system: string;
}

export interface NixOS extends Resource<"Nix.NixOS", NixOSProps, NixOSAttributes> {}

/**
 * A host running a NixOS configuration from a flake. It deploys when the
 * configuration evaluates to a different system than the one last deployed,
 * so planning costs one `nix eval` and never contacts the host.
 */
export const NixOS = Resource<NixOS>("Nix.NixOS");

const evalSystem = ({ flakeRoot, configuration }: NixOSProps) =>
	evalRaw(flakeRoot, `nixosConfigurations.${configuration}.config.system.build.toplevel.outPath`);

export const NixOSProvider = () =>
	Provider.effect(
		NixOS,
		Effect.gen(function* () {
			const { run } = yield* Command.CommandExecutor;

			return {
				list: () => Effect.succeed([]),
				diff: Effect.fn(function* ({ olds, news, output }) {
					if (!output || !isResolved(news)) {
						return undefined;
					}
					// A row without a recorded system, such as one migrated from
					// another resource type, deploys to record one.
					if (!output.system || havePropsChanged(olds, news)) {
						return { action: "update" };
					}
					const system = yield* evalSystem(news);
					return { action: system === output.system ? "noop" : "update" };
				}),
				reconcile: Effect.fn(function* ({ news, session }) {
					const { flakeRoot, configuration: _configuration, after: _after, env, ...commandProps } = news;
					const system = yield* evalSystem(news);
					yield* run(
						{
							...commandProps,
							cwd: resolveFlakeRoot(flakeRoot),
							env: { ...env, NIXOS_SYSTEM: system },
						},
						session,
					);
					return { system } satisfies NixOSAttributes;
				}),
				delete: () => Effect.void,
			};
		}),
	);
