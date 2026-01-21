{
  lib,
  moduleLocation,
  ...
}: let
  inherit
    (lib)
    mapAttrs
    mkOption
    types
    ;
in {
  options = {
    flake = {
      darwinConfigurations = mkOption {
        type = types.lazyAttrsOf types.raw;
        default = {};
      };
      darwinModules = mkOption {
        type = types.lazyAttrsOf types.deferredModule;
        default = {};
        apply = mapAttrs (k: v: {
          _class = "darwin";
          _file = "${toString moduleLocation}#darwinModules.${k}";
          imports = [v];
        });
      };
    };
  };
}
