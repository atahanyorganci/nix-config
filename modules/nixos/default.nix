inputs: {
  # Enable flakes and nix commands
  nix.settings.experimental-features = [ "nix-command" "flakes" ];
  # Compatibility with NixOS
  system.stateVersion = "24.05";
  # Individual imports
  imports = [
    ./gnome
    ./jellyfin
    ./podman
    ./prowlarr
    ./radarr
    ./sonarr
    ./ssh
  ];
}
