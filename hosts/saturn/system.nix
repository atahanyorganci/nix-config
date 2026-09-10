{user, ...}: {
  hostInventory.role = "managedTarget";
  hostInventory.netbird.group = "Servers";
  aws.enable = true;
  networking.hostName = "saturn";
  time.timeZone = "Europe/Istanbul";
  # Keep target-side Nix builds within t4g.medium (4 GiB) memory limits.
  nix.settings = {
    max-jobs = 1;
    cores = 2;
  };
  programs.${user.shell}.enable = true;
  # Key-only SSH; allow remote nixos-rebuild --elevate=sudo.
  ssh.enable = true;
  systemd.services.sshd.serviceConfig.LimitNOFILE = 524288;
  security.sudo.wheelNeedsPassword = false;
  netbird = {
    enable = true;
    setupKeyFile = "/var/lib/netbird-client/setup.key";
  };
}
