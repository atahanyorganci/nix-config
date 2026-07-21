{lib, ...}: let
  cacheName = "atahanyorganci";
  cachePublicKey = "atahanyorganci.cachix.org-1:r9ZNvFHFKPxydR+do9PhRGHk2x/MuxG5U8ilm7t9mWs=";
  cacheUrl = "https://${cacheName}.cachix.org";
  nixosCacheUrl = "https://cache.nixos.org/";
  nixosCachePublicKey = "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY=";

  netbirdPackagesBySystem = {
    x86_64-linux = ["netbird" "netbird-server" "netbird-proxy"];
    aarch64-linux = ["netbird"];
    aarch64-darwin = ["netbird" "netbird-app"];
  };
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

  options.flake.netbirdCache = lib.mkOption {
    type = lib.types.submodule {
      options.packagesBySystem = lib.mkOption {
        type = lib.types.attrsOf (lib.types.listOf lib.types.str);
      };
    };
  };

  config = {
    flake.cachix = {
      inherit cacheName cacheUrl cachePublicKey;
    };

    flake.netbirdCache = {
      packagesBySystem = netbirdPackagesBySystem;
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

    perSystem = {
      pkgs,
      lib,
      system,
      ...
    }: let
      names = netbirdPackagesBySystem.${system} or [];
      getDrvPath = name:
        if builtins.hasAttr name pkgs
        then pkgs.${name}.drvPath
        else throw "NetBird cache check: missing package ${name} on ${system}";
      cacheKey = builtins.hashString "sha256" (
        lib.concatStringsSep "\n" (map getDrvPath names)
      );
    in {
      checks.netbird-cache-key = pkgs.writeText "netbird-cache-key" cacheKey;
    };
  };
}
