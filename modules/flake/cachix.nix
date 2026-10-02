{lib, ...}: let
  cacheName = "atahanyorganci";
  cachePublicKey = "atahanyorganci.cachix.org-1:r9ZNvFHFKPxydR+do9PhRGHk2x/MuxG5U8ilm7t9mWs=";
  cacheUrl = "https://${cacheName}.cachix.org";
  nixosCacheUrl = "https://cache.nixos.org/";
  nixosCachePublicKey = "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY=";
in {
  options.flake.cachix = lib.mkOption {
    type = lib.types.submodule {
      options = {
        cacheName = lib.mkOption {type = lib.types.str;};
        cacheUrl = lib.mkOption {type = lib.types.str;};
        cachePublicKey = lib.mkOption {type = lib.types.str;};
      };
    };
  };

  config = {
    flake.cachix = {
      inherit cacheName cacheUrl cachePublicKey;
    };

    flake.nixConfig = {
      extra-substituters = [cacheUrl];
      extra-trusted-public-keys = [cachePublicKey];
    };

    flake.modules.nixos.cachix = {
      nix.settings = {
        substituters = [cacheUrl];
        trusted-public-keys = [cachePublicKey];
      };
    };

    flake.modules.darwin.cachix = {
      nix.settings = {
        substituters = [nixosCacheUrl cacheUrl];
        trusted-public-keys = [nixosCachePublicKey cachePublicKey];
      };
    };
  };
}
