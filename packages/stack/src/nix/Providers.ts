import * as Command from "alchemy/Command";
import * as Provider from "alchemy/Provider";
import * as Layer from "effect/Layer";
import { Expr, ExprProvider } from "./Expr.ts";
import { NixOS, NixOSProvider } from "./NixOS.ts";

export class Providers extends Provider.ProviderCollection<Providers>()("Nix") {}

/** Register the providers for every Nix resource. */
export const providers = () =>
	Layer.effect(Providers, Provider.collection([Expr, NixOS])).pipe(
		Layer.provide(Layer.mergeAll(ExprProvider(), NixOSProvider())),
		Layer.provide(Command.CommandExecutorLive()),
	);
