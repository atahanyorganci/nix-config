{config, ...}: let
  infra = config.flake.infra;
in {
  flake.modules.nixos.netbird-proxy = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.netbird-proxy;
    stateDir = "/var/lib/netbird-proxy";
  in {
    options.netbird-proxy = {
      enable = lib.mkEnableOption "NetBird reverse proxy";

      domain = lib.mkOption {
        type = lib.types.str;
        default = infra.domain;
        description = "Apex domain for the proxy cluster (NB_PROXY_DOMAIN).";
      };

      managementUrl = lib.mkOption {
        type = lib.types.str;
        default = "http://127.0.0.1:8081";
        description = "NetBird management URL for the proxy gRPC connection.";
      };

      tokenFile = lib.mkOption {
        type = lib.types.path;
        example = "/var/lib/netbird-proxy/token";
        description = "Path to a plaintext file containing the NetBird proxy access token.";
      };

      package = lib.mkOption {
        type = lib.types.package;
        default = pkgs.netbird-proxy;
        defaultText = lib.literalExpression "pkgs.netbird-proxy";
        description = "NetBird reverse proxy package.";
      };

      listenAddress = lib.mkOption {
        type = lib.types.str;
        default = ":8443";
        description = "Address the proxy listens on (Traefik TLS passthrough targets this).";
      };

      healthAddress = lib.mkOption {
        type = lib.types.str;
        default = "127.0.0.1:8082";
        description = "Address for the proxy health probe endpoint.";
      };

      private = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = ''
          Advertise the Private capability (NB_PROXY_PRIVATE). Unlocks NetBird-Only
          Access and Agent Network mesh endpoints; public reverse-proxy services remain available.
        '';
      };
    };

    config = lib.mkIf cfg.enable {
      users.users.netbird-proxy = {
        isSystemUser = true;
        group = "netbird-proxy";
        home = stateDir;
        createHome = true;
      };
      users.groups.netbird-proxy = {};

      # Token is provisioned out-of-band; ensure parent state dir exists with safe perms.
      systemd.tmpfiles.rules = [
        "d ${stateDir} 0750 netbird-proxy netbird-proxy - -"
        "d ${stateDir}/certs 0750 netbird-proxy netbird-proxy - -"
        "d ${stateDir}/geolocation 0750 netbird-proxy netbird-proxy - -"
        "d ${stateDir}/.local/state/netbird 0750 netbird-proxy netbird-proxy - -"
        "d ${stateDir}/.config/netbird 0750 netbird-proxy netbird-proxy - -"
        "d ${stateDir}/nb-client 0750 netbird-proxy netbird-proxy - -"
      ];

      systemd.services.netbird-proxy = {
        description = "NetBird reverse proxy";
        documentation = ["https://docs.netbird.io/selfhosted/migration/enable-reverse-proxy"];
        after = ["network-online.target" "netbird-server.service" "traefik.service"];
        wants = ["network-online.target"];
        wantedBy = ["multi-user.target"];
        unitConfig = {
          ConditionPathExists = cfg.tokenFile;
        };

        serviceConfig = {
          Type = "simple";
          User = "netbird-proxy";
          Group = "netbird-proxy";
          # tokenFile holds the raw token (or NB_PROXY_TOKEN=...); export before exec.
          ExecStart = pkgs.writeShellScript "netbird-proxy-start" ''
            set -euo pipefail
            token="$(tr -d '[:space:]' < ${lib.escapeShellArg cfg.tokenFile})"
            case "$token" in
              NB_PROXY_TOKEN=*) export "$token" ;;
              *) export NB_PROXY_TOKEN="$token" ;;
            esac
            exec ${lib.getExe cfg.package}
          '';
          Restart = "on-failure";
          RestartSec = "5s";

          Environment =
            [
              "NB_PROXY_DOMAIN=${cfg.domain}"
              "NB_PROXY_MANAGEMENT_ADDRESS=${cfg.managementUrl}"
              "NB_PROXY_ALLOW_INSECURE=true"
              "NB_PROXY_ADDRESS=${cfg.listenAddress}"
              "NB_PROXY_ACME_CERTIFICATES=true"
              # HTTP-01 via Traefik :80 → 127.0.0.1:8085 (tls-alpn-01 hangs behind Traefik passthrough).
              "NB_PROXY_ACME_CHALLENGE_TYPE=http-01"
              "NB_PROXY_ACME_ADDRESS=127.0.0.1:8085"
              "NB_PROXY_CERTIFICATE_DIRECTORY=${stateDir}/certs"
              "NB_PROXY_HEALTH_ADDRESS=${cfg.healthAddress}"
              "NB_PROXY_REQUIRE_SUBDOMAIN=true"
              "NB_PROXY_GEO_DATA_DIR=${stateDir}/geolocation"
              "HOME=${stateDir}"
              "XDG_CONFIG_HOME=${stateDir}/.config"
              "XDG_STATE_HOME=${stateDir}/.local/state"
              "XDG_DATA_HOME=${stateDir}/.local/share"
            ]
            ++ lib.optional cfg.private "NB_PROXY_PRIVATE=true";

          StateDirectory = "netbird-proxy";
          StateDirectoryMode = "0750";
          WorkingDirectory = stateDir;
          # Embedded NetBird client hardcodes /var/lib/netbird for state.
          BindPaths = ["${stateDir}/nb-client:/var/lib/netbird"];

          # Hardening — proxy needs TUN / net admin for WireGuard to peers.
          NoNewPrivileges = true;
          PrivateTmp = true;
          ProtectSystem = "strict";
          ProtectHome = true;
          ProtectKernelTunables = true;
          ProtectKernelModules = true;
          ProtectControlGroups = true;
          ProtectHostname = true;
          ProtectClock = true;
          LockPersonality = true;
          RestrictSUIDSGID = true;
          RestrictRealtime = true;
          RestrictNamespaces = true;
          RemoveIPC = true;
          SystemCallArchitectures = "native";
          ReadWritePaths = [stateDir];
          DeviceAllow = ["/dev/net/tun rw"];
          PrivateDevices = false;
          AmbientCapabilities = ["CAP_NET_ADMIN"];
          CapabilityBoundingSet = ["CAP_NET_ADMIN"];
          # Go runtime may need writable memory that looks executable on some platforms.
          MemoryDenyWriteExecute = false;
        };
      };
    };
  };
}
