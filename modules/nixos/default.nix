{
  config,
  lib,
  inputs,
  ...
}: let
  autoImport = lib.attrValues (
    lib.filterAttrs (n: _: n != "default") config.flake.modules.nixos
  );
in {
  flake.modules.nixos.default = {
    imports =
      [
        inputs.disko.nixosModules.disko
        inputs.hermes-agent.nixosModules.default
        inputs.home-manager.nixosModules.home-manager
        inputs.stylix.nixosModules.stylix
        inputs.vscode-server.nixosModules.default
      ]
      ++ autoImport;
  };
}
