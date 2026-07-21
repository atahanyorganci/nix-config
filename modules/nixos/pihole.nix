{
  flake.modules.nixos.pihole = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.pihole;
    # NetBird NixOS client exposes WireGuard as nb-<clientName>.
    netbirdInterface = "nb-wt0";
  in {
    options.pihole = {
      enable = lib.mkEnableOption "Pi-hole DNS for NetBird mesh peers";
      hostName = lib.mkOption {
        type = lib.types.str;
        example = "mars.netbird.selfhosted";
        description = "Hostname for the Pi-hole admin UI (services.pihole-web).";
      };
    };

    config = lib.mkIf cfg.enable {
      services.pihole-ftl = {
        enable = true;
        # Mesh-only: do not open 53 on all interfaces.
        openFirewallDNS = false;
        openFirewallDHCP = false;
        openFirewallWebserver = false;
        lists = [
          {
            url = "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts";
            type = "block";
            enabled = true;
            description = "StevenBlack unified hosts";
          }
        ];
        settings = {
          dns = {
            interface = netbirdInterface;
            listeningMode = "BIND";
            upstreams = [
              "1.1.1.1"
              "9.9.9.9"
            ];
          };
          # NixOS already syncs time via systemd-timesyncd; FTL's NTP client
          # often can't set the clock and just spam "No valid NTP replies".
          ntp = {
            ipv4.active = false;
            ipv6.active = false;
            sync.active = false;
          };
        };
      };

      # Admin UI on all interfaces; NixOS firewall limits access to NetBird.
      services.pihole-web = {
        enable = true;
        hostName = cfg.hostName;
        ports = [8053];
      };

      httpServices.pihole = {
        port = 8053;
        expose = {
          enable = true;
          private = true;
        };
        auth = {type = "none";};
      };

      # DNS + admin UI only on the NetBird interface (not the public NIC).
      networking.firewall.interfaces.${netbirdInterface} = {
        allowedUDPPorts = [53];
        allowedTCPPorts = [
          53
          8053
        ];
      };

      # pihole-ftl-setup exits 1 when blocklists are already present; treat as success.
      systemd.services.pihole-ftl-setup = {
        serviceConfig.SuccessExitStatus = "0 1";
      };

      # Skip start until the NetBird iface exists (avoids hanging nixos-rebuild).
      systemd.services.pihole-ftl = {
        after = ["netbird-wt0.service"];
        wants = ["netbird-wt0.service"];
        unitConfig = {
          ConditionPathExists = "/sys/class/net/${netbirdInterface}";
          StartLimitIntervalSec = 0;
        };
        serviceConfig.RestartSec = lib.mkForce "5s";
      };

      # Start Pi-hole when the NetBird interface appears.
      systemd.paths.pihole-ftl-on-wt0 = {
        wantedBy = ["multi-user.target"];
        pathConfig = {
          PathExists = "/sys/class/net/${netbirdInterface}";
          Unit = "pihole-ftl.service";
        };
      };

      # After login brings the iface up, ensure Pi-hole binds.
      systemd.services.netbird-wt0-login = lib.mkIf (config.netbird.enable && config.netbird.setupKeyFile != null) {
        serviceConfig.ExecStartPost = [
          "+${pkgs.systemd}/bin/systemctl --no-block start pihole-ftl.service"
        ];
      };
    };
  };
}
