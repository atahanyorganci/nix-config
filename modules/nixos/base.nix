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
