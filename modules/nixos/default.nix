{ ... }: {
  # Enable flakes and nix commands
  nix.settings.experimental-features = [ "nix-command" "flakes" ];
  # NixOS version
  system.stateVersion = "25.05";
  # Individual imports
  imports = [
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
