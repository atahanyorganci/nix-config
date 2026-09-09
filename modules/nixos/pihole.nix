{
  flake.modules.nixos.pihole = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.pihole;
    ftl = config.services.pihole-ftl;
    # NetBird NixOS client exposes WireGuard as nb-<clientName>.
    netbirdInterface = "nb-wt0";
    pihole = lib.getExe ftl.piholePackage;
    jq = lib.getExe pkgs.jq;
    kill = lib.getExe' pkgs.procps "kill";
    gravityDb = "${ftl.stateDirectory}/gravity.db";
    listsStamp = "${ftl.stateDirectory}/nixos-lists.sha256";
    desiredLists = builtins.toJSON (map (list: {
        address = list.url;
        inherit (list) type enabled;
        comment = list.description;
      })
      ftl.lists);
    # Mirrors the sandbox of the upstream setup unit.
    hardening = {
      User = ftl.user;
      Group = ftl.group;
      NoNewPrivileges = true;
      PrivateTmp = true;
      PrivateDevices = true;
      DevicePolicy = "closed";
      ProtectSystem = "strict";
      ProtectHome = "read-only";
      ProtectControlGroups = true;
      ProtectKernelModules = true;
      ProtectKernelTunables = true;
      ReadWritePaths = [ftl.configDirectory ftl.stateDirectory ftl.logDirectory];
      RestrictAddressFamilies = "AF_UNIX AF_INET AF_INET6 AF_NETLINK";
      RestrictNamespaces = true;
      RestrictRealtime = true;
      RestrictSUIDSGID = true;
      MemoryDenyWriteExecute = true;
      LockPersonality = true;
    };
    setupScript = ''
      set -eo pipefail
      # shellcheck disable=SC1091
      source ${ftl.piholePackage}/share/pihole/advanced/Scripts/api.sh
      # shellcheck disable=SC1091
      source ${ftl.piholePackage}/share/pihole/advanced/Scripts/utils.sh

      # The unit is ordered after pihole-ftl.service, but FTL answers its API
      # only a moment after it starts. TestAPIAvailability exits on failure,
      # hence the subshell.
      ready=0
      for _ in $(seq 60); do
        if (TestAPIAvailability) >/dev/null 2>&1; then
          ready=1
          break
        fi
        sleep 1
      done
      if [ "$ready" != 1 ]; then
        echo "pihole-ftl-setup: FTL API not reachable after 60s; leaving lists as they are" >&2
        exit 0
      fi

      # First start: gravity.sh creates the database, then FTL is told to open it.
      if [ ! -s ${lib.escapeShellArg gravityDb} ]; then
        ${pihole} -g
        ${kill} -s SIGRTMIN "$(systemctl show --property MainPID --value pihole-ftl.service)"
      fi

      LoginAPI

      want=${lib.escapeShellArg desiredLists}
      have=$(GetFTLData "lists" | ${jq} -c '[.lists[]?.address]')
      changed=0
      while IFS= read -r entry; do
        address=$(${jq} -r '.address' <<<"$entry")
        if ${jq} -e --arg address "$address" 'index($address) != null' <<<"$have" >/dev/null; then
          continue
        fi
        echo "pihole-ftl-setup: adding list $address"
        PostFTLData "lists?type=$(${jq} -r '.type' <<<"$entry")" "$entry" >/dev/null
        changed=1
      done < <(${jq} -c '.[]' <<<"$want")

      # Rebuild gravity only when the declared lists changed; the weekly timer
      # refreshes the list contents.
      digest=$(printf '%s' "$want" | sha256sum | cut -d ' ' -f 1)
      if [ "$changed" = 1 ] || [ "$(cat ${lib.escapeShellArg listsStamp} 2>/dev/null)" != "$digest" ]; then
        if ${pihole} -g; then
          printf '%s\n' "$digest" >${lib.escapeShellArg listsStamp}
        else
          echo "pihole-ftl-setup: gravity update failed; the weekly timer will retry" >&2
        fi
      fi
    '';
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
            # Shown in the web UI; listening is configured below.
            interface = netbirdInterface;
            listeningMode = "NONE";
            upstreams = [
              "1.1.1.1"
              "9.9.9.9"
            ];
          };
          # Bind the NetBird addresses individually and follow the interface as
          # it comes and goes. BIND (bind-interfaces) refuses to start without
          # the interface, and ALL binds the wildcard, which collides with the
          # systemd-resolved stub listener.
          misc.dnsmasq_lines = [
            "interface=${netbirdInterface}"
            "bind-dynamic"
          ];
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
        # Agents peers (jupiter) are isolated and keep their provider resolver;
        # the reverse-proxy peer needs no Pi-hole either.
        groups = ["Admin" "Users" "Servers"];
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

      # Soft ordering only: FTL no longer needs the interface to exist at start.
      systemd.services.pihole-ftl.after = ["netbird-wt0.service"];

      # Idempotent setup: waits for the API, adds only missing lists, rebuilds
      # gravity only when the declared lists changed, and never fails activation
      # on transient conditions.
      systemd.services.pihole-ftl-setup = {
        after = ["pihole-ftl.service"];
        script = lib.mkForce setupScript;
      };

      # Refresh list contents weekly, independent of boot and activation.
      systemd.services.pihole-gravity = {
        description = "Pi-hole gravity refresh";
        after = ["pihole-ftl.service" "network-online.target"];
        wants = ["network-online.target"];
        serviceConfig = hardening // {Type = "oneshot";};
        script = "${pihole} -g";
      };
      systemd.timers.pihole-gravity = {
        wantedBy = ["timers.target"];
        timerConfig = {
          OnCalendar = "Sun 03:30";
          Persistent = true;
          RandomizedDelaySec = "1h";
        };
      };
    };
  };
}
