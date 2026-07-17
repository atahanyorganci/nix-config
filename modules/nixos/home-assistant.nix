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
    # Samsung Frame Art Mode + enhanced TV control (personal art upload without Art Store).
    samsungtvSmart = pkgs.buildHomeAssistantComponent rec {
      owner = "TheFab21";
      domain = "samsungtv_smart";
      version = "8.3.3";
      src = pkgs.fetchFromGitHub {
        owner = "TheFab21";
        repo = "ha-samsungtv-smart";
        tag = version;
        hash = "sha256-FhSX5bIaM+RRSBu+z+0cvGf2Mc+EpexieDmaGOJS1ng=";
      };
      dependencies = with pkgs.home-assistant.python3Packages; [
        aiofiles
        casttube
        pillow
        pysmartthings
        wakeonlan
        websocket-client
      ];
      meta = {
        description = "Samsung Smart TV control with Frame Art Mode support";
        homepage = "https://github.com/TheFab21/ha-samsungtv-smart";
        license = lib.licenses.lgpl21;
      };
    };
    # YAML HomeKit only — do not also add bridges via the UI (that spawns extra ports).
    # TVs / media players that act as Televisions must use accessory mode (one entity each).
    homekit = [
      {
        name = "Home";
        port = 21063;
        filter = {
          include_entities = [
            # Xiaomi Air Purifier 4 Compact
            "fan.xiaomi_cpa4_37b1_air_purifier"
            "sensor.xiaomi_cpa4_37b1_pm25_density"
            "sensor.xiaomi_cpa4_37b1_filter_life_level"
            "switch.xiaomi_cpa4_37b1_alarm"
            "switch.xiaomi_cpa4_37b1_physical_control_locked"
            # Arçelik dishwasher (HomeWhiz)
            "switch.dishwasher"
            "switch.dishwasher_halfload"
            "switch.dishwasher_doormatic"
            "binary_sensor.dishwasher_door_is_open"
            "binary_sensor.dishwasher_no_salt"
            "binary_sensor.dishwasher_no_rinse_aid"
            "binary_sensor.dishwasher_no_water"
            "binary_sensor.dishwasher_check_the_filter"
            "binary_sensor.dishwasher_remote_control"
            # Samsung Frame Art Mode (TV itself is a separate accessory)
            "switch.samsung_frame_tv_55_art_mode"
            "number.samsung_frame_tv_55_art_mode_brightness"
            "number.samsung_frame_tv_55_art_mode_color_temperature"
          ];
        };
        entity_config = {
          "fan.xiaomi_cpa4_37b1_air_purifier" = {
            type = "air_purifier";
            linked_filter_life_level_sensor = "sensor.xiaomi_cpa4_37b1_filter_life_level";
            linked_pm25_sensor = "sensor.xiaomi_cpa4_37b1_pm25_density";
          };
          "switch.dishwasher" = {
            name = "Dishwasher";
          };
          "switch.samsung_frame_tv_55_art_mode" = {
            name = "Frame Art Mode";
          };
          "number.samsung_frame_tv_55_art_mode_brightness" = {
            name = "Frame Art Brightness";
          };
          "number.samsung_frame_tv_55_art_mode_color_temperature" = {
            name = "Frame Art Color Temperature";
          };
        };
      }
      {
        name = "Samsung Frame";
        port = 21064;
        mode = "accessory";
        filter.include_entities = [
          "media_player.samsung_frame_tv_55"
        ];
        entity_config."media_player.samsung_frame_tv_55" = {
          name = "Samsung Frame";
          feature_list = [
            {feature = "on_off";}
            {feature = "play_pause";}
            {feature = "play_stop";}
            {feature = "toggle_mute";}
          ];
        };
      }
      {
        name = "Apple TV";
        port = 21065;
        mode = "accessory";
        filter.include_entities = [
          "media_player.living_room_living_room"
        ];
        entity_config."media_player.living_room_living_room" = {
          name = "Apple TV";
          feature_list = [
            {feature = "on_off";}
            {feature = "play_pause";}
            {feature = "play_stop";}
          ];
        };
      }
    ];
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
            # Soft deps / optional backends for samsungtv_smart (Frame Art + SmartThings).
            "application_credentials"
            "folder"
            "local_file"
            "smartthings"
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
          samsungtvSmart
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
            logs."custom_components.samsungtv_smart" = "info";
            logs."homeassistant.components.homekit" = "info";
          };
          # HomeKit bridges allows Apple's Home app to control the devices.
          inherit homekit;
          # Control Center TV remote: arrows/back/info only fire events — map them to Samsung keys.
          # Keep the Jinja on one line; NixOS YAML folding breaks multiline templates.
          automation = [
            {
              id = "samsung_frame_homekit_remote";
              alias = "Samsung Frame HomeKit remote keys";
              mode = "queued";
              trigger = [
                {
                  platform = "event";
                  event_type = "homekit_tv_remote_key_pressed";
                  event_data.entity_id = "media_player.samsung_frame_tv_55";
                }
              ];
              action = [
                {
                  action = "media_player.play_media";
                  target.entity_id = "media_player.samsung_frame_tv_55";
                  data = {
                    media_content_type = "send_key";
                    media_content_id = "{{ {'arrow_up':'KEY_UP','arrow_down':'KEY_DOWN','arrow_left':'KEY_LEFT','arrow_right':'KEY_RIGHT','select':'KEY_ENTER','back':'KEY_RETURN','information':'KEY_MENU','exit':'KEY_EXIT'}[trigger.event.data.key_name] }}";
                  };
                }
              ];
            }
          ];
        };
      };
      # Expose the UI only to peers connected through NetBird.
      networking.firewall.interfaces."nb-wt0".allowedTCPPorts = [cfg.port];
      # HomeKit HAP ports (derived from homekit bridge/accessory entries). mDNS UDP 5353 via mdns.
      networking.firewall.allowedTCPPorts = map (bridge: bridge.port) homekit;

      systemd.services.home-assistant.serviceConfig.RestartSec = "5s";
    };
  };
}
