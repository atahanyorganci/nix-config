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
    };
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
