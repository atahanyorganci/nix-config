{ config
, pkgs
, user
, ...
}:
{
  imports = [
    ./hardware-configuration.nix
  ];
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
  # Internationalization
  i18n.defaultLocale = "en_US.UTF-8";
  i18n.extraLocaleSettings = {
    LC_ADDRESS = "tr_TR.UTF-8";
    LC_IDENTIFICATION = "tr_TR.UTF-8";
    LC_MEASUREMENT = "tr_TR.UTF-8";
    LC_MONETARY = "tr_TR.UTF-8";
    LC_NAME = "tr_TR.UTF-8";
    LC_NUMERIC = "tr_TR.UTF-8";
    LC_PAPER = "tr_TR.UTF-8";
    LC_TELEPHONE = "tr_TR.UTF-8";
    LC_TIME = "tr_TR.UTF-8";
  };
  # Configure keymap in X11
  services.xserver.xkb = {
    layout = "tr";
    variant = "";
  };
  # Configure console keymap
  console.keyMap = "trq";
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
}
