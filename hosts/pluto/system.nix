{user, ...}: {
  hostInventory.role = null;
  hetzner = {
    enable = true;
    consoleAutologin = true;
  };
  networking.hostName = "pluto";
  time.timeZone = "Europe/Istanbul";
  programs.${user.shell}.enable = true;
  # Key-only SSH; allow remote nixos-rebuild --elevate=sudo.
  ssh.enable = true;
  systemd.services.sshd.serviceConfig.LimitNOFILE = 524288;
  security.sudo.wheelNeedsPassword = false;
}
