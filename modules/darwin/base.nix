{
  config,
  withSystem,
  ...
}: let
  inherit (config.flake.modules.darwin) homebrew shell system;
in {
  flake.modules.darwin.base = {config, ...}: {
    nixpkgs.pkgs = withSystem config.nixpkgs.system (
      {pkgs, ...}: pkgs
    );
    imports = [
      homebrew
      shell
      system
    ];
  };
}
