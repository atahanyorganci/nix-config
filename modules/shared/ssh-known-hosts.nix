{
  config,
  lib,
  ...
}: let
  # Every host with a pinned SSH host key, under the names it is reached by
  # (`hostInventory.ssh.hostNames`: e.g. `mars` and `mars.netbird.selfhosted`).
  # The keys are the ones backed up in nix-secrets, so a restored host keeps
  # matching them.
  pinnedHosts = lib.filterAttrs (_: host: host.publicKey != null) (
    lib.mapAttrs (_: system: {
      inherit (system.config.hostInventory.ssh) hostNames;
      publicKey = system.config.hostInventory.ssh.hostKey;
    }) (config.flake.nixosConfigurations // config.flake.darwinConfigurations)
  );

  # Written to /etc/ssh/ssh_known_hosts, which ssh consults alongside
  # ~/.ssh/known_hosts: connecting to a pinned host by any of its names checks
  # its key against the flake instead of trusting it on first use, and a
  # machine presenting another key under those names is refused.
  module = {
    programs.ssh.knownHosts = pinnedHosts;
  };
in {
  flake.modules.nixos.ssh-known-hosts = module;
  flake.modules.darwin.ssh-known-hosts = module;
}
