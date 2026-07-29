{
  config,
  lib,
  inputs,
  ...
}: {
  flake.modules.darwin.default = {
    imports =
      [
        inputs.home-manager.darwinModules.home-manager
        inputs.stylix.darwinModules.stylix
      ]
      ++ lib.attrValues (
        lib.filterAttrs (n: _: n != "default") config.flake.modules.darwin
      );
  };
}
