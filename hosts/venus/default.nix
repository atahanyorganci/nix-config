{ config
, pkgs
, user
, ...
}:
{
  # Bootloader.
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;
  # Networking
  networking = {
    hostName = "mercury";
    networkmanager.enable = true;
  };
  # Time Zone
  time.timeZone = "Europe/Istanbul";
  # Default user
  users.users.${user.username} = {
    isNormalUser = true;
    description = user.name;
    extraGroups = [ "networkmanager" "wheel" ];
    openssh.authorizedKeys.keys = builtins.map (key: "${key} ${user.username}@${config.networking.hostName}") user.authorizedKeys;
  };
  # Enable automatic login for the user.
  services.getty.autologinUser = "atahan";
  # Allow unfree packages
  nixpkgs.config.allowUnfree = true;
  # Enable GPG for SSH and commit signing
  programs.gnupg.agent = {
    enable = true;
    enableSSHSupport = true;
  };
  # Enable Podman containerization
  podman.enable = true;
  # Enable SSH server
  ssh.enable = true;
  # Enable VSCode Server
  services.vscode-server.enable = true;
  # Enable Tailscale
  tailscale = {
    enable = true;
    domain = "jackal-mercat.ts.net";
  };
}
