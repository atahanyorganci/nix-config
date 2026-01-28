{user, ...}: {
  # Bootloader.
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;
  # Networking
  networking = {
    hostName = "mercury";
    networkmanager.enable = true;
  };
  # Enable mDNS (mercury.local hostname resolution)
  mdns.enable = true;
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
  # Add default user to `networkmanager` group
  users.users.${user.username}.extraGroups = ["networkmanager"];
  # Enable automatic login for the user.
  services.getty.autologinUser = user.username;
  # Allow unfree packages
  nixpkgs.config.allowUnfree = true;
  # Enable GPG for SSH and commit signing
  programs.gnupg.agent = {
    enable = true;
    enableSSHSupport = true;
  };
  # Enable Docker runtime
  docker.enable = true;
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
