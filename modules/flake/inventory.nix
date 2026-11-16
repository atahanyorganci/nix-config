{
  config,
  lib,
  ...
}: let
  # Hosts that receive managedTargets via extraSpecialArgs must not be
  # extracted while building managedTargets (avoids infinite recursion).
  managedTargetsConsumers = ["sol"];

  extract = name: sys: let
    c = sys.config;
    system = sys.pkgs.stdenv.hostPlatform.system;
  in {
    inherit name system;
    role = c.hostInventory.role;
    ssh = {
      inherit (c.hostInventory.ssh) hostNames uid user;
      isDarwin = lib.hasSuffix "-darwin" system;
    };
    netbird = {
      inherit (c.hostInventory.netbird) group loginExpirationEnabled inactivityExpirationEnabled;
    };
  };

  allSystems =
    config.flake.nixosConfigurations // config.flake.darwinConfigurations;

  extracted =
    lib.mapAttrs extract
    (builtins.removeAttrs allSystems managedTargetsConsumers);

  managedTargets =
    lib.filterAttrs (_: h: h.role == "managedTarget") extracted;

  agentHolders = lib.filterAttrs (_: h: h.role == "agentHolder") (
    lib.mapAttrs extract allSystems
  );

  # Peers the flake does not configure (`flake.externalPeers`): only what the
  # stack needs, and no SSH, which nothing here manages for them.
  externalPeers =
    lib.mapAttrs (name: peer: {
      inherit name;
      system = null;
      role = null;
      netbird = {
        inherit (peer.netbird) group loginExpirationEnabled inactivityExpirationEnabled;
      };
    })
    config.flake.externalPeers;

  clashes = lib.attrNames (lib.intersectAttrs config.flake.externalPeers allSystems);

  inventory = {
    inherit managedTargets agentHolders externalPeers;
  };
in {
  options.flake.inventory = lib.mkOption {
    type = lib.types.raw;
    description = "Host inventory inferred from NixOS and Darwin configurations";
  };

  config = {
    flake.inventory =
      lib.throwIf (clashes != [])
      "flake.externalPeers: ${lib.concatStringsSep ", " clashes} is also a NixOS or Darwin configuration"
      inventory;

    perSystem = {pkgs, ...}: {
      packages.inventory-json =
        pkgs.writeText "inventory.json" (builtins.toJSON inventory);
    };
  };
}
