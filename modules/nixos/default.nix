{
  config,
  lib,
  ...
}: {
  flake.modules.nixos.default = {
    imports = lib.attrValues (
      lib.filterAttrs (n: _: n != "default") config.flake.modules.nixos
    );
  };
}
