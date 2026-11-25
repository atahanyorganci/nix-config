{
  config,
  withSystem,
  ...
}: let
  user = config.flake.me;
in {
  flake.modules.nixos.base = {config, ...}: {
    nixpkgs.pkgs = withSystem config.nixpkgs.system (
      {pkgs, ...}: pkgs
    );
    nix.settings = {
      experimental-features = ["nix-command" "flakes"];
      trusted-users = ["root" "@wheel"];
      # Collect garbage during a build once free space falls under 2 GiB,
      # until 10 GiB are free, rather than failing it: mars ran out of disk
      # mid-deploy.
      min-free = 2 * 1024 * 1024 * 1024;
      max-free = 10 * 1024 * 1024 * 1024;
    };
    # Generations older than two weeks and whatever nothing refers to any more
    # go weekly; mars had kept fifty system generations, most of its disk.
    nix.gc = {
      automatic = true;
      dates = "weekly";
      options = "--delete-older-than 14d";
      persistent = true;
      randomizedDelaySec = "1h";
    };
    nix.optimise.automatic = true;
    # ssh-ng / nixos-rebuild --build-host inherit the SSH session ulimit.
    # The default 1024 FDs is too low for a full system+home-manager closure.
    security.pam.loginLimits = [
      {
        domain = "*";
        type = "soft";
        item = "nofile";
        value = "1048576";
      }
      {
        domain = "*";
        type = "hard";
        item = "nofile";
        value = "1048576";
      }
    ];
    # Run generic-Linux binaries (bun, workerd, fallow, sharp's add-on from npm)
    # through a real `/lib64/ld-linux-x86-64.so.2`, so dev shells work without
    # patchelf; the default library set covers libstdc++, zlib and openssl.
    programs.nix-ld.enable = true;
    systemd.settings.Manager.DefaultLimitNOFILE = "1048576";
    system.stateVersion = "26.05";
    users.users.${user.username} = {
      isNormalUser = true;
      description = user.name;
      createHome = true;
      home = "/home/${user.username}";
      extraGroups = ["wheel"];
      openssh.authorizedKeys.keys =
        builtins.map (
          key: "${key} ${user.username}@${config.networking.hostName}"
        )
        user.authorizedKeys;
    };
  };
}
