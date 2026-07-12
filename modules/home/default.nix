{
  config,
  lib,
  ...
}: {
  flake.modules.homeManager.default = {
    imports = lib.attrValues (
      lib.filterAttrs (n: _: n != "default") config.flake.modules.homeManager
    );
  };
}
