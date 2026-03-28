{
  pkgs,
  config,
  lib,
  inputs,
  ...
}: let
  system = pkgs.stdenv.hostPlatform.system;
  brightness = inputs.brightness.packages.${system}.default;
  darwinPackages = [brightness];
in {
  options.tools.enable = lib.mkEnableOption "miscellaneous tools";
  config = lib.mkIf config.tools.enable {
    home.packages = with pkgs;
      [
        just
        dust
        hyperfine
        tokei
        fastfetch
        go-task
        pandoc
        qrencode
        scc
        alejandra
        mmv
        gitleaks
        btop
        # Nix LSP
        nixd
        nil
        # Just LSP
        just-lsp
      ]
      ++ (
        if pkgs.stdenv.isDarwin
        then darwinPackages
        else []
      );
  };
}
