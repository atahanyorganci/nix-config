{
  user,
  pkgs,
  ...
}: {
  hostInventory.role = "managedTarget";
  hostInventory.netbird.group = "Agents";
  hetzner = {
    enable = true;
    consoleAutologin = true;
  };
  environment.systemPackages = with pkgs; [
    git
    gh
  ];
  systemd.services.hermes-agent.path = with pkgs; [
    git
    gh
  ];
  # Keep target-side Hermes builds within this instance's memory limits.
  nix.settings = {
    max-jobs = 1;
    cores = 2;
  };
  networking.hostName = "jupiter";
  time.timeZone = "Europe/Istanbul";
  programs.${user.shell}.enable = true;
  # Key-only SSH; allow remote nixos-rebuild --elevate=sudo.
  ssh.enable = true;
  systemd.services.sshd.serviceConfig.LimitNOFILE = 524288;
  security.sudo.wheelNeedsPassword = false;
  netbird = {
    enable = true;
    setupKeyFile = "/var/lib/netbird-client/setup.key";
  };
  # Hermes agent + web dashboard at https://hermes.yorganci.dev
  services.hermes-agent = {
    enable = true;
    settings = {
      model.default = "~deepseek/deepseek-v4-flash-latest";
      telegram.require_mention = true;
    };
    environmentFiles = ["/var/lib/hermes/env"];
    dashboard = {
      enable = true;
      host = "127.0.0.1";
      port = 9120;
      auth.type = "none";
      bind = {
        interface = "nb-wt0";
        port = 9119;
        netbirdClient = "wt0";
      };
      expose = {
        key = "hermes";
        accessGroups = ["Admin"];
      };
    };
  };
}
