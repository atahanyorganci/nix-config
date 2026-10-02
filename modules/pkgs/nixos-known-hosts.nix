{
  config,
  lib,
  ...
}: let
  # Pinned host keys from every NixOS configuration that declares one.
  pinned = lib.filterAttrs (_: key: key != null) (
    lib.mapAttrs (_: system: system.config.hostInventory.ssh.hostKey) config.flake.nixosConfigurations
  );

  # Keyed by configuration name rather than address: the deploy scripts
  # connect with `HostKeyAlias=<name>`, so a key is checked against the host
  # it is meant to be, whatever IP the infrastructure stack hands out.
  knownHosts = lib.concatStrings (lib.mapAttrsToList (name: key: "${name} ${key}\n") pinned);
in {
  perSystem = {pkgs, ...}: {
    packages.nixos-known-hosts = pkgs.writeText "nixos-known-hosts" knownHosts;
  };
}
