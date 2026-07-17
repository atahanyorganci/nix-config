{
  flake.modules.nixos.home-assistant = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.home-assistant;
    authHeader = pkgs.buildHomeAssistantComponent rec {
      owner = "BeryJu";
      domain = "auth_header";
      version = "1.12";
      src = pkgs.fetchFromGitHub {
        owner = "BeryJu";
        repo = "hass-auth-header";
        tag = "v${version}";
        hash = "sha256-BPG/G6IM95g9ip2OsPmcAebi2ZvKHUpFzV4oquOFLPM=";
      };
      # Upstream Makefile runs isort/black/ruff; not needed for install.
      postPatch = ''
        rm -f Makefile
      '';
      meta = {
        description = "Home Assistant custom component for reverse-proxy header authentication";
        homepage = "https://github.com/BeryJu/hass-auth-header";
        license = lib.licenses.gpl3Only;
      };
    };
    # Arçelik / Beko / Grundig appliances via the HomeWhiz app.
    homewhiz = pkgs.buildHomeAssistantComponent rec {
      owner = "home-assistant-HomeWhiz";
      domain = "homewhiz";
      version = "0.5.22";
      src = pkgs.fetchFromGitHub {
        owner = "home-assistant-HomeWhiz";
        repo = "home-assistant-HomeWhiz";
        tag = "v${version}";
        hash = "sha256-lkL3NjdVY8e5ZQSaIqdMLf3aH+HEbhWoKr3OzGmPPeE=";
      };
      dependencies = with pkgs.home-assistant.python3Packages; [
        aiohttp
        awsiotsdk
        bidict
        bleak
        bleak-retry-connector
        dacite
      ];
      meta = {
        description = "Home Assistant integration for HomeWhiz appliances (Arçelik, Beko, Grundig)";
        homepage = "https://github.com/home-assistant-HomeWhiz/home-assistant-HomeWhiz";
        license = lib.licenses.mit;
      };
    };
  in {
    options.home-assistant = {
      enable = lib.mkEnableOption "Home Assistant";

      port = lib.mkOption {
        type = lib.types.port;
        default = 8123;
        description = "Port on which Home Assistant listens.";
      };

      externalUrl = lib.mkOption {
        type = lib.types.str;
        description = "Public Home Assistant URL (e.g. Pangolin).";
      };

      internalUrl = lib.mkOption {
        type = lib.types.str;
        description = "Home Assistant URL on the NetBird mesh.";
      };

      trustedProxies = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [
          "127.0.0.1"
          "::1"
          # NetBird / Tailscale CGNAT — Pangolin Newt reaches HA via the mesh.
          "100.64.0.0/10"
          # Docker bridge (Newt or other local proxies).
          "172.16.0.0/12"
        ];
        description = "Proxy addresses Home Assistant should trust for X-Forwarded-* headers.";
      };

      extraComponents = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [];
        description = "Additional Home Assistant integration domains to package (append-only).";
      };

      usernameHeader = lib.mkOption {
        type = lib.types.str;
        # Pangolin/NetBird on this mesh forwards identity as X-Netbird-User (not Remote-Name).
        default = "X-Netbird-User";
        description = "HTTP header used by auth_header for SSO username matching.";
      };
    };

    config = lib.mkIf cfg.enable {
      services.home-assistant = {
        enable = true;
        # paho-mqtt's broker timing tests are flaky under loaded builders.
        # The package itself is unchanged; only its build-time test suite is skipped.
        package = pkgs.home-assistant.override {
          packageOverrides = _final: prev: {
            paho-mqtt = prev.paho-mqtt.overridePythonAttrs (_old: {
              doCheck = false;
            });
          };
        };
        openFirewall = false;
        # Integrations cannot install Python deps at runtime on NixOS.
        extraComponents =
          [
            "analytics"
            "default_config"
            "esphome"
            "google_translate"
            "isal"
            "met"
            # Devices currently discovered on mercury (journal: missing pyatv/pychromecast/getmac).
            "apple_tv"
            "cast"
            "samsungtv"
            # Xiaomi/Miio air purifiers etc. (UI label: "Xiaomi Home").
            "xiaomi_miio"
            # Required by custom xiaomi_miot (media_player imports homekit → pyhap; camera needs ffmpeg).
            "ffmpeg"
            "homekit"
            # HomeWhiz (Arçelik dishwasher): Bluetooth local and/or cloud (Wi-Fi).
            "bluetooth"
            "bluetooth_adapters"
          ]
          ++ cfg.extraComponents;
        # xiaomi_miot: Air Purifier 4 Compact (xiaomi.airp.cpa4) — unsupported by stock xiaomi_miio.
        customComponents = [
          authHeader
          homewhiz
          pkgs.home-assistant-custom-components.xiaomi_miot
        ];
        config = {
          default_config = {};
          homeassistant = {
            external_url = cfg.externalUrl;
            internal_url = cfg.internalUrl;
            allowlist_external_urls = [cfg.externalUrl];
          };
          # Pangolin/NetBird forwards X-Netbird-User (email). HA login username must match.
          auth_header = {
            username_header = cfg.usernameHeader;
            allow_bypass_login = true;
            debug = true;
          };
          http = {
            server_host = "0.0.0.0";
            server_port = cfg.port;
            use_x_forwarded_for = true;
            trusted_proxies = cfg.trustedProxies;
            cors_allowed_origins = [
              "https://google.com"
              "https://www.home-assistant.io"
            ];
            ip_ban_enabled = true;
            login_attempts_threshold = 2;
          };
          logger = {
            default = "info";
            logs."custom_components.auth_header" = "debug";
            logs."custom_components.homewhiz" = "info";
          };
        };
      };

      # Expose the UI only to peers connected through NetBird.
      networking.firewall.interfaces."nb-wt0".allowedTCPPorts = [cfg.port];

      systemd.services.home-assistant.serviceConfig.RestartSec = "5s";
    };
  };
}
