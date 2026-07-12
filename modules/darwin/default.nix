{
  config,
  lib,
  ...
}: {
  flake.modules.darwin.default = {
    imports = lib.attrValues (
      lib.filterAttrs (n: _: n != "default") config.flake.modules.darwin
    );
  };
}
