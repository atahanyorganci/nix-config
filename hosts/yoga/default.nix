{ config, pkgs, user, inputs, ... }:
{
  imports = [
    ./hardware-configuration.nix
  ];
  # Bootloader
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;
  # Networking
  networking = {
    hostName = "yoga";
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
  # Configure console keymap
  console.keyMap = "trq";
  # Enable CUPS to print documents.
  services.printing.enable = true;
  # Enable sound with pipewire.
  hardware.pulseaudio.enable = false;
  security.rtkit.enable = true;
  services.pipewire = {
    enable = true;
    alsa.enable = true;
    alsa.support32Bit = true;
    pulse.enable = true;
  };
  # Default user
  users.users.${user.username} = {
    isNormalUser = true;
    description = user.name;
    extraGroups = [ "networkmanager" "wheel" ];
    openssh.authorizedKeys.keys = builtins.map (key: "${key} ${user.username}@${config.networking.hostName}") user.authorizedKeys;
  };
  # Enable GPG for SSH and commit signing
  programs.gnupg.agent = {
    enable = true;
    enableSSHSupport = true;
  };
  # Enable Podman containerization
  podman.enable = true;
  # Enable Gnome DE
  gnome = {
    enable = true;
    layout = "tr";
  };
  # Enable SSH server
  ssh.enable = true;
  # Visiual Studio Server
  services.vscode-server.enable = true;
}
