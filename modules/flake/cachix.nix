{lib, ...}: let
  cacheName = "atahanyorganci";
  cachePublicKey = "atahanyorganci.cachix.org-1:r9ZNvFHFKPxydR+do9PhRGHk2x/MuxG5U8ilm7t9mWs=";
  cacheUrl = "https://${cacheName}.cachix.org";
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

    # Determinate Nix runs the daemon on Darwin, so `nix.settings` would be
    # ignored; the daemon reads these from `/etc/nix/nix.custom.conf`.
    flake.modules.darwin.cachix = {
      determinateNix.customSettings = {
        extra-substituters = [cacheUrl];
        extra-trusted-public-keys = [cachePublicKey];
      };
    };
  };
}
