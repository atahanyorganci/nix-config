{ lib, moduleLocation, ... }:
let
  inherit (lib)
    mapAttrs
    mkOption
    types
    ;
in
{
  options = {
    flake = {
      darwinModules = mkOption {
        type = types.lazyAttrsOf types.deferredModule;
        default = { };
        apply = mapAttrs (k: v: {
          _class = "darwin";
          _file = "${toString moduleLocation}#darwinModules.${k}";
          imports = [ v ];
        });
      };
      homeModules = mkOption {
        type = types.lazyAttrsOf types.deferredModule;
        default = { };
        apply = mapAttrs (k: v: {
          _class = "homeManager";
          _file = "${toString moduleLocation}#homeModules.${k}";
          imports = [ v ];
        });
      };
    };
  };
}
