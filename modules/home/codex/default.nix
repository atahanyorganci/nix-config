{
  lib,
  config,
  pkgs,
  inputs,
  ...
}: let
  system = pkgs.stdenv.hostPlatform.system;
  codexApp = inputs.nix-casks.packages.${system}.codex-app;
in {
  options.codex.enable = lib.mkEnableOption "OpenAI Codex";
  config = lib.mkIf config.codex.enable {
    home.packages =
      [
        pkgs.codex
      ]
      ++ (
        if pkgs.stdenv.isDarwin
        then [codexApp]
        else []
      );
  };
}
