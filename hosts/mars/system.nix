{user, ...}: rec {
  hostInventory.role = "managedTarget";
  hostInventory.netbird.group = "Servers";
  hetzner.enable = true;
  networking.hostName = "mars";
  time.timeZone = "Europe/Istanbul";
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
  console.keyMap = "trq";
  programs.${user.shell}.enable = true;
  # Key-only SSH; allow remote nixos-rebuild --use-remote-sudo.
  ssh.enable = true;
  systemd.services.sshd.serviceConfig.LimitNOFILE = 524288;
  security.sudo.wheelNeedsPassword = false;
  netbird-server = {
    enable = true;
    acmeEmail = user.email;
    enableAgentNetwork = true;
  };
  netbird-proxy = {
    enable = true;
    tokenFile = "/var/lib/netbird-proxy/token";
    private = true;
  };
  # Join the mesh as a peer so Pi-hole is reachable on wt0.
  netbird = {
    enable = true;
    setupKeyFile = "/var/lib/netbird-client/setup.key";
  };
  pihole = {
    enable = true;
    hostName = "${networking.hostName}.netbird.selfhosted";
  };
}
