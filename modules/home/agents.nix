{
  flake.modules.homeManager.agents = {
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
    options.agents.enable = lib.mkEnableOption "Agent harnesses";
    config = lib.mkIf config.agents.enable {
      home.packages = darwinPackages ++ [pkgs.cursor-cli pkgs."9router"];
      programs = {
        codex.enable = true;
        opencode.enable = true;
        claude-code.enable = true;
        pi-coding-agent.enable = true;
        t3code = {
          enable = true;
          package =
            if pkgs.stdenv.isDarwin
            then inputs.nix-casks.packages.${system}.t3-code
            else pkgs.t3code;
        };
      };
    };
  };
}
