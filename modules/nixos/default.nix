{ user
, config
, pkgs
, ...
}:
let
  shellBin = "${pkgs.${user.shell}}/bin/${user.shell}";
in
{
  # Enable flakes and nix commands
  nix.settings.experimental-features = [ "nix-command" "flakes" ];
  # NixOS version
  system.stateVersion = "26.05";
  # Default user
  users = {
    # This being `true` leads to a few nasty bugs, change at your own risk!
    mutableUsers = false;
    users.${user.username} = {
      isNormalUser = true;
      description = user.name;
      createHome = true;
      home = "/home/${user.username}";
      extraGroups = [ "wheel" ];
      openssh.authorizedKeys.keys = builtins.map (key: "${key} ${user.username}@${config.networking.hostName}") user.authorizedKeys;
    };
  };
  # Individual imports
  imports = [
    ./docker
    ./gnome
    ./jellyfin
    ./podman
    ./prowlarr
    ./radarr
    ./sonarr
    ./ssh
    ./tailscale
  ];
}
