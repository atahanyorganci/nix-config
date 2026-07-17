{user, ...}: {
  hostInventory.role = "managedTarget";
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
  # Enable Docker runtime
  docker.enable = true;
  # Enable SSH server
  ssh.enable = true;
  # Allow sudo authentication using a forwarded SSH agent. The trusted key is
  # the user's declarative SSH authorized key; password authentication remains
  # available as a fallback.
  security.pam = {
    rssh.enable = true;
    services.sudo.rssh = true;
  };
  # Enable VSCode Server
  services.vscode-server.enable = true;
  # Self-hosted NetBird mesh
  netbird = {
    enable = true;
    setupKeyFile = "/var/lib/netbird-client/setup.key";
  };
  # Home Assistant: NetBird for mesh peers, Pangolin for public HTTPS.
  home-assistant = {
    enable = true;
    externalUrl = "https://home-assistant.yorganci.dev";
    internalUrl = "http://mercury.netbird.selfhosted:8123";
  };
}
