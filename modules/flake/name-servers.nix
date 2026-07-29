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
      nameservers = sys.config.nameServers;
    };

  allSystems =
    config.flake.nixosConfigurations // config.flake.darwinConfigurations;

  extracted = lib.mapAttrs extract allSystems;

  hostNames = lib.concatMap (
    name: let
      host = extracted.${name};
    in
      if host.nameservers == {}
      then []
      else [host.name]
  ) (builtins.attrNames extracted);

  uniqueHostNames = lib.unique hostNames;

  nameServers =
    lib.filterAttrs (_: h: h.nameservers != {}) extracted;
in {
  options.flake.nameServers = lib.mkOption {
    type = lib.types.raw;
    description = "NetBird nameserver groups inferred from NixOS and Darwin configurations";
  };

  config = {
    flake.nameServers =
      if lib.length hostNames == lib.length uniqueHostNames
      then nameServers
      else throw "flake.nameServers: duplicate host names among configurations with nameservers";

    perSystem = {pkgs, ...}: {
      packages.name-servers-json =
        pkgs.writeText "name-servers.json" (builtins.toJSON config.flake.nameServers);
    };
  };
}
