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
            # BIND to NetBird only. ALL races systemd-resolved / leftover sockets
            # ("Address already in use") and leaves DNS dead while FTL stays up.
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
          accessGroups = ["Admin"];
        };
        auth = {type = "none";};
      };

      nameServers.pihole-primary = {
        description = "Pi-hole filtered DNS for mesh peers";
        primary = true;
        enabled = true;
        port = 53;
        groups = ["All"];
        domains = [];
        searchDomainsEnabled = false;
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

      # BIND needs nb-wt0; wait for it (netbird-wt0.service can be active before
      # the iface exists). Avoid PathExists→restart loops during nixos-rebuild:
      # the iface is already present, so a path unit thrashing try-restart hits
      # start-limit and leaves FTL dead mid-switch.
      systemd.services.pihole-ftl = {
        after = ["netbird-wt0.service" "network-online.target"];
        wants = ["netbird-wt0.service"];
        wantedBy = ["multi-user.target"];
        unitConfig.StartLimitIntervalSec = 0;
        serviceConfig = {
          ExecStartPre = lib.mkBefore [
            "+${pkgs.bash}/bin/bash -c 'i=0; while [[ $i -lt 90 ]]; do [[ -d /sys/class/net/${netbirdInterface} ]] && exit 0; i=$((i+1)); ${pkgs.coreutils}/bin/sleep 1; done; echo \"pihole-ftl: ${netbirdInterface} missing after 90s\" >&2; exit 1'"
          ];
          Restart = lib.mkForce "on-failure";
          RestartSec = lib.mkForce "5s";
          TimeoutStopSec = "20s";
        };
      };

      # After login brings the iface up, ensure Pi-hole binds.
      systemd.services.netbird-wt0-login = lib.mkIf (config.netbird.enable && config.netbird.setupKeyFile != null) {
        serviceConfig.ExecStartPost = [
          "+${pkgs.systemd}/bin/systemctl --no-block try-restart pihole-ftl.service"
        ];
      };
    };
  };
}
