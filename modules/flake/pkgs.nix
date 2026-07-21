{
  inputs,
  config,
  lib,
  ...
}: {
  perSystem = {system, ...}: {
    _module.args.pkgs = import inputs.nixpkgs {
      inherit system;
      config = {
        allowUnfree = true;
        allowBroken = true;
      };
      overlays = lib.attrValues config.flake.overlays;
    };
    packages.nixos-anywhere = inputs.nixos-anywhere.packages.${system}.default;
  };
}
