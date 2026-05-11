{
  lib,
  config,
  pkgs,
  inputs,
  ...
}: let
  system = pkgs.stdenv.hostPlatform.system;
  darwinPackages =
    if pkgs.stdenv.isDarwin
    then [
      inputs.nix-casks.packages.${system}.codex-app
    ]
    else [];
in {
  options.agents.enable = lib.mkEnableOption "OpenAI Codex";
  config = lib.mkIf config.agents.enable {
    home.packages = with pkgs; [pi-coding-agent] ++ darwinPackages;
    programs = {
      codex.enable = true;
      opencode.enable = true;
      claude-code.enable = true;
    };
  };
}
