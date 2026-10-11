{
  config,
  inputs,
  lib,
  ...
}: let
  # deploy-rs's helpers, but installing the `activate` binary from nixpkgs so
  # targets substitute it from cache.nixos.org rather than building the flake's
  # own Rust package. The `deploy-rs` package below is the matching CLI. Keyed
  # by system so nixpkgs is extended once per platform, not once per host.
  deployRs = lib.genAttrs config.systems (system: let
    pkgs = inputs.nixpkgs.legacyPackages.${system};
  in
    (pkgs.appendOverlays [
      inputs.deploy-rs.overlays.default
      (_: prev: {
        deploy-rs = {
          inherit (pkgs) deploy-rs;
          inherit (prev.deploy-rs) lib;
        };
      })
    ])
    .deploy-rs);

  managedTargets = lib.filterAttrs (_: system: system.config.hostInventory.role == "managedTarget") (
    config.flake.nixosConfigurations // config.flake.darwinConfigurations
  );

  mkNode = name: system: let
    inherit (system.config.hostInventory) ssh;
    platform = system.pkgs.stdenv.hostPlatform;
    inherit (deployRs.${platform.system}.lib) activate;

    # Only the key pinned for this host is trusted, whatever address it is
    # reached at (`--hostname` overrides it with an IP). Not ~/.ssh/known_hosts,
    # not the system-wide file.
    knownHosts =
      if ssh.hostKey == null
      then throw "deploy: ${name} has no pinned host key; set hostInventory.ssh.hostKey"
      else builtins.toFile "${name}-known-hosts" "${name} ${ssh.hostKey}\n";
  in
    {
      hostname = "${name}.netbird.selfhosted";
      sshUser = ssh.user;
      user = "root";
      # Build on the target, never on the machine running the deploy.
      remoteBuild = true;
      sshOpts = [
        "-o"
        "BatchMode=yes"
        "-o"
        "ConnectTimeout=10"
        "-o"
        "HostKeyAlias=${name}"
        "-o"
        "StrictHostKeyChecking=yes"
        "-o"
        "UserKnownHostsFile=${knownHosts}"
        "-o"
        "GlobalKnownHostsFile=/dev/null"
        # Fresh connections only. Magic rollback confirms a deploy by reaching
        # the host again after activation; the connection ~/.ssh/config keeps
        # open to managed hosts predates it, so reusing that would confirm a
        # host that no longer accepts new connections.
        "-o"
        "ControlMaster=no"
        "-o"
        "ControlPath=none"
        # Without the GPG RemoteForward from ~/.ssh/config: a forward taken by
        # a deploy dies when the deploy ends, and with it signing for every
        # session on the host.
        "-o"
        "ClearAllForwardings=yes"
      ];
      profiles.system.path =
        if platform.isDarwin
        then activate.darwin system
        else activate.nixos system;
    }
    // lib.optionalAttrs platform.isDarwin {
      # /tmp is a symlink on macOS, and the activation watcher compares the
      # paths FSEvents reports (/private/tmp/...) against the unresolved one,
      # so it never sees the confirmation and rolls back every deploy.
      # https://github.com/serokell/deploy-rs/pull/404
      tempPath = "/private/tmp";
    };

  # The nodes with each profile reduced to its store path, without the
  # derivation behind it: the schema only needs a string, and with the
  # derivation attached the check would build every host's system on the
  # machine running `nix flake check`.
  schemaNodes = lib.mapAttrs (_: node:
    node
    // {
      profiles = lib.mapAttrs (_: profile:
        profile
        // {
          path = builtins.unsafeDiscardStringContext "${profile.path}";
        })
      node.profiles;
    })
  config.flake.deploy.nodes;
in {
  flake.deploy.nodes = lib.mapAttrs mkNode managedTargets;

  perSystem = {system, ...}: {
    packages.deploy-rs = deployRs.${system}.deploy-rs;

    checks.deploy-schema = (deployRs.${system}.lib.deployChecks {nodes = schemaNodes;}).deploy-schema;
  };
}
