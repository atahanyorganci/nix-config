{
  config,
  lib,
  ...
}: let
  extract = name: sys: let
    rawHostName = sys.config.networking.hostName or null;
    hostName =
      if rawHostName == null
      then ""
      else rawHostName;
  in
    assert (hostName == "" || hostName == name); {
      inherit name;
      system = sys.pkgs.stdenv.hostPlatform.system;
      services = sys.config.httpServices;
    };

  allSystems =
    config.flake.nixosConfigurations // config.flake.darwinConfigurations;

  extracted = lib.mapAttrs extract allSystems;

  hostNames = lib.concatMap (
    name: let
      host = extracted.${name};
    in
      if host.services == {}
      then []
      else [host.name]
  ) (builtins.attrNames extracted);

  uniqueHostNames = lib.unique hostNames;

  # Peers the flake does not configure serve theirs alike; their names cannot
  # clash with a configuration's (flake.inventory checks).
  external =
    lib.mapAttrs (name: peer: {
      inherit name;
      system = null;
      services = peer.httpServices;
    })
    config.flake.externalPeers;

  httpServices =
    lib.filterAttrs (_: h: h.services != {}) (extracted // external);
in {
  options.flake.httpServices = lib.mkOption {
    type = lib.types.raw;
    description = "HTTP services inferred from NixOS and Darwin configurations and flake.externalPeers";
  };

  config = {
    flake.httpServices =
      if lib.length hostNames == lib.length uniqueHostNames
      then httpServices
      else throw "flake.httpServices: duplicate host names among configurations with services";

    perSystem = {pkgs, ...}: {
      packages.http-services-json =
        pkgs.writeText "http-services.json" (builtins.toJSON config.flake.httpServices);
    };
  };
}
