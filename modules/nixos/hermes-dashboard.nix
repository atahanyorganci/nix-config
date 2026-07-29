{config, ...}: let
  infra = config.flake.infra;
in {
  flake.modules.nixos.hermes-dashboard = {
    lib,
    config,
    pkgs,
    ...
  }: let
    hermesCfg = config.services.hermes-agent;
    cfg = hermesCfg.dashboard;

    loopbackHosts = ["127.0.0.1" "localhost" "::1"];
    isLoopback = builtins.elem cfg.host loopbackHosts;

    # Hermes auth gate only engages on non-loopback binds.
    hasHermesAuth = cfg.auth.type != "none" && !isLoopback;

    # NetBird reverse-proxy auth with required fields present.
    hasProxyAuth =
      cfg.expose.auth.type
      != "none"
      && (
        if cfg.expose.auth.type == "password"
        then cfg.expose.auth.passwordFile != null
        else if cfg.expose.auth.type == "pin"
        then cfg.expose.auth.pin != null
        else if cfg.expose.auth.type == "header"
        then cfg.expose.auth.headers != []
        else true # bearer / link
      );

    hasProperAuth = hasHermesAuth || hasProxyAuth;

    bindActive = cfg.bind.interface != null;

    effectivePrivate =
      if cfg.expose.private != null
      then cfg.expose.private
      else !hasProperAuth;

    upstreamPort =
      if cfg.bind.upstreamPort != null
      then cfg.bind.upstreamPort
      else cfg.port;

    publicUrl =
      if cfg.publicUrl != null
      then cfg.publicUrl
      else if bindActive
      then "https://${cfg.expose.key}.${infra.domain}"
      else null;

    # Map Hermes auth options → settings.dashboard.*
    hermesAuthSettings =
      if cfg.auth.type == "basic"
      then {
        basic_auth = lib.filterAttrs (_: v: v != null && v != "") {
          username = cfg.auth.basic.username;
          password = cfg.auth.basic.password;
          password_hash = cfg.auth.basic.passwordHash;
          secret = cfg.auth.basic.secret;
          session_ttl_seconds = cfg.auth.basic.sessionTtlSeconds;
        };
      }
      else if cfg.auth.type == "oauth"
      then {
        oauth = lib.filterAttrs (_: v: v != null && v != "") {
          client_id = cfg.auth.oauth.clientId;
          portal_url = cfg.auth.oauth.portalUrl;
        };
      }
      else if cfg.auth.type == "oidc"
      then {
        oauth = {
          provider = "self-hosted";
          self_hosted = lib.filterAttrs (_: v: v != null && v != "") {
            issuer = cfg.auth.oidc.issuer;
            client_id = cfg.auth.oidc.clientId;
            scopes = cfg.auth.oidc.scopes;
          };
        };
      }
      else {};

    caddyfile = pkgs.writeText "hermes-dashboard-Caddyfile" ''
      {
        auto_https off
        admin off
      }

      # Match any Host (NetBird sends the public hostname). Bind only on the
      # mesh interface IP so the listener is not exposed on eth0.
      http://:{$LISTEN_PORT} {
        bind {$BIND_IP}
        reverse_proxy {$UPSTREAM} {
          # Hermes loopback bind only accepts loopback Host/Origin (DNS-rebinding
          # guard). NetBird clients present the public hostname — rewrite Host
          # and drop Origin so WebSocket upgrades (/api/ws, /api/pty) succeed.
          header_up Host {upstream_hostport}
          header_up -Origin
          header_up X-Forwarded-Proto {http.request.header.X-Forwarded-Proto}
          header_up X-Forwarded-Host {http.request.header.X-Forwarded-Host}
          header_up X-Real-IP {http.request.header.X-Real-IP}
        }
        ${cfg.bind.extraCaddyConfig}
      }
    '';

    caddyScript = pkgs.writeShellScript "hermes-dashboard-caddy" ''
      set -euo pipefail
      INTERFACE="${cfg.bind.interface}"
      BIND_IP=$(${pkgs.iproute2}/bin/ip -4 -o addr show dev "$INTERFACE" \
        | ${pkgs.gawk}/bin/awk '{print $4}' \
        | ${pkgs.coreutils}/bin/cut -d/ -f1 \
        | ${pkgs.coreutils}/bin/head -1)
      if [ -z "$BIND_IP" ]; then
        echo "hermes-dashboard-caddy: $INTERFACE has no IPv4 address yet" >&2
        exit 1
      fi
      export BIND_IP
      export LISTEN_PORT="${toString cfg.bind.port}"
      export UPSTREAM="${cfg.bind.upstreamHost}:${toString upstreamPort}"
      exec ${pkgs.caddy}/bin/caddy run \
        --config ${caddyfile} \
        --adapter caddyfile
    '';
  in {
    options.services.hermes-agent.dashboard = {
      enable = lib.mkEnableOption "Hermes Agent web dashboard (management UI)";

      host = lib.mkOption {
        type = lib.types.str;
        default = "127.0.0.1";
        description = "Bind address for `hermes dashboard`. Loopback skips the Hermes auth gate.";
      };

      port = lib.mkOption {
        type = lib.types.port;
        default = 9120;
        description = "Port for the Hermes dashboard process.";
      };

      openBrowser = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Auto-open a browser when the dashboard starts.";
      };

      publicUrl = lib.mkOption {
        type = lib.types.nullOr lib.types.str;
        default = null;
        description = ''
          Override for settings.dashboard.public_url.
          When null and bind.interface is set, defaults to
          https://<expose.key>.${infra.domain}.
        '';
      };

      auth = {
        type = lib.mkOption {
          type = lib.types.enum ["none" "basic" "oauth" "oidc"];
          default = "none";
          description = ''
            Hermes dashboard auth provider. The auth gate only engages on
            non-loopback binds. For mesh-only access without Hermes login,
            use type = "none" with a loopback host and bind.interface.
          '';
        };

        basic = {
          username = lib.mkOption {
            type = lib.types.str;
            default = "";
            description = "Basic-auth username.";
          };
          password = lib.mkOption {
            type = lib.types.nullOr lib.types.str;
            default = null;
            description = "Plaintext password (prefer passwordHash).";
          };
          passwordHash = lib.mkOption {
            type = lib.types.nullOr lib.types.str;
            default = null;
            description = "scrypt password hash (preferred over plaintext).";
          };
          secret = lib.mkOption {
            type = lib.types.nullOr lib.types.str;
            default = null;
            description = "Token-signing secret for stable sessions across restarts.";
          };
          sessionTtlSeconds = lib.mkOption {
            type = lib.types.nullOr lib.types.int;
            default = null;
            description = "Access-token lifetime in seconds (default 12h).";
          };
        };

        oauth = {
          clientId = lib.mkOption {
            type = lib.types.nullOr lib.types.str;
            default = null;
            description = "Nous Portal OAuth client ID (agent:{instance_id}).";
          };
          portalUrl = lib.mkOption {
            type = lib.types.nullOr lib.types.str;
            default = null;
            description = "Override Nous Portal URL (blank → plugin default).";
          };
        };

        oidc = {
          issuer = lib.mkOption {
            type = lib.types.nullOr lib.types.str;
            default = null;
            description = "OIDC issuer URL.";
          };
          clientId = lib.mkOption {
            type = lib.types.nullOr lib.types.str;
            default = null;
            description = "OIDC public client ID.";
          };
          scopes = lib.mkOption {
            type = lib.types.nullOr lib.types.str;
            default = null;
            description = "OIDC scopes (default: openid profile email).";
          };
        };
      };

      bind = {
        interface = lib.mkOption {
          type = lib.types.nullOr lib.types.str;
          default = null;
          example = "nb-wt0";
          description = ''
            Network interface for the Caddy listener. When non-null, the
            module automatically deploys hermes-dashboard-caddy bound to
            this interface's primary IPv4 address and registers httpServices.
            Null = no Caddy, no reverse-proxy registration (local-only).
          '';
        };

        port = lib.mkOption {
          type = lib.types.port;
          default = 9119;
          description = "Listen port on the interface IP (httpServices + Caddy).";
        };

        upstreamHost = lib.mkOption {
          type = lib.types.str;
          default = "127.0.0.1";
          description = "Upstream host for reverse_proxy (usually matches dashboard.host).";
        };

        upstreamPort = lib.mkOption {
          type = lib.types.nullOr lib.types.port;
          default = null;
          description = "Upstream port; defaults to dashboard.port when null.";
        };

        netbirdClient = lib.mkOption {
          type = lib.types.nullOr lib.types.str;
          default = "wt0";
          description = ''
            NetBird client name for systemd ordering (netbird-<name>.service).
            Set null to skip NetBird-specific after/wants/condition.
          '';
        };

        extraCaddyConfig = lib.mkOption {
          type = lib.types.lines;
          default = "";
          description = "Additional Caddyfile directives inside the site block.";
        };
      };

      expose = {
        key = lib.mkOption {
          type = lib.types.str;
          default = "hermes";
          description = "httpServices key → https://<key>.${infra.domain}";
        };

        private = lib.mkOption {
          type = lib.types.nullOr lib.types.bool;
          default = null;
          description = ''
            Override exposure scope. Null = auto: false (internet) when
            proper auth is configured, true (NetBird mesh only) otherwise.
          '';
        };

        accessGroups = lib.mkOption {
          type = lib.types.listOf lib.types.str;
          default = [];
          description = "NetBird group IDs; empty uses stack default (All group).";
        };

        auth = {
          type = lib.mkOption {
            type = lib.types.enum [
              "none"
              "bearer"
              "link"
              "password"
              "pin"
              "header"
            ];
            default = "none";
            description = "NetBird reverse-proxy authentication mode.";
          };

          distributionGroups = lib.mkOption {
            type = lib.types.listOf lib.types.str;
            default = [];
            description = "NetBird distribution groups for bearer/OIDC auth.";
          };

          passwordFile = lib.mkOption {
            type = lib.types.nullOr lib.types.path;
            default = null;
            description = "Plaintext password file for proxy password auth.";
          };

          pin = lib.mkOption {
            type = lib.types.nullOr lib.types.str;
            default = null;
            description = "PIN value for proxy pin auth.";
          };

          headers = lib.mkOption {
            type = lib.types.listOf (lib.types.submodule {
              options = {
                header = lib.mkOption {type = lib.types.str;};
                value = lib.mkOption {type = lib.types.str;};
              };
            });
            default = [];
            description = "Required header name/value pairs for header auth.";
          };
        };
      };
    };

    config = lib.mkIf (cfg.enable && hermesCfg.enable) (lib.mkMerge [
      {
        assertions = [
          {
            assertion =
              cfg.expose.auth.type
              != "password"
              || cfg.expose.auth.passwordFile != null;
            message = ''
              services.hermes-agent.dashboard.expose.auth.type = "password"
              requires expose.auth.passwordFile.
            '';
          }
          {
            assertion =
              cfg.expose.auth.type
              != "pin"
              || cfg.expose.auth.pin != null;
            message = ''
              services.hermes-agent.dashboard.expose.auth.type = "pin"
              requires expose.auth.pin.
            '';
          }
          {
            assertion =
              cfg.expose.auth.type
              != "header"
              || cfg.expose.auth.headers != [];
            message = ''
              services.hermes-agent.dashboard.expose.auth.type = "header"
              requires at least one expose.auth.headers entry.
            '';
          }
          {
            assertion =
              cfg.auth.type
              != "basic"
              || (cfg.auth.basic.username
                != ""
                && (cfg.auth.basic.password
                  != null
                  || cfg.auth.basic.passwordHash != null));
            message = ''
              services.hermes-agent.dashboard.auth.type = "basic" requires
              auth.basic.username and either password or passwordHash.
            '';
          }
          {
            assertion =
              cfg.auth.type
              != "oauth"
              || cfg.auth.oauth.clientId != null;
            message = ''
              services.hermes-agent.dashboard.auth.type = "oauth" requires
              auth.oauth.clientId.
            '';
          }
          {
            assertion =
              cfg.auth.type
              != "oidc"
              || (cfg.auth.oidc.issuer
                != null
                && cfg.auth.oidc.clientId != null);
            message = ''
              services.hermes-agent.dashboard.auth.type = "oidc" requires
              auth.oidc.issuer and auth.oidc.clientId.
            '';
          }
        ];

        warnings =
          lib.optional (cfg.auth.type != "none" && isLoopback) ''
            services.hermes-agent.dashboard.auth.type = "${cfg.auth.type}"
            with host = "${cfg.host}": the Hermes auth gate never engages on
            loopback. Use a non-loopback host, or rely on expose.auth /
            NetBird mesh ACLs.
          ''
          ++ lib.optional (bindActive && !hasProperAuth) ''
            services.hermes-agent.dashboard.bind.interface = "${cfg.bind.interface}"
            with no auth configured: httpServices will be mesh-only
            (private = true). Configure dashboard.auth or expose.auth to
            expose to the internet.
          '';

        services.hermes-agent.settings.dashboard =
          hermesAuthSettings
          // lib.optionalAttrs (publicUrl != null) {
            public_url = publicUrl;
          };

        systemd.services.hermes-dashboard = {
          description = "Hermes Agent Web Dashboard";
          wantedBy = ["multi-user.target"];
          after = [
            "hermes-agent.service"
            "network-online.target"
          ];
          wants = ["network-online.target"];

          environment = {
            HOME = hermesCfg.stateDir;
            HERMES_HOME = "${hermesCfg.stateDir}/.hermes";
            HERMES_MANAGED = "true";
          };

          serviceConfig = {
            User = hermesCfg.user;
            Group = hermesCfg.group;
            WorkingDirectory = hermesCfg.workingDirectory;

            ExecStart = lib.concatStringsSep " " (
              [
                "${hermesCfg.package}/bin/hermes"
                "dashboard"
                "--host"
                cfg.host
                "--port"
                (toString cfg.port)
              ]
              ++ lib.optional (!cfg.openBrowser) "--no-open"
            );

            Restart = "on-failure";
            RestartSec = "5s";
            UMask = "0007";

            NoNewPrivileges = true;
            ProtectSystem = "strict";
            ProtectHome = false;
            ReadWritePaths = [
              hermesCfg.stateDir
              hermesCfg.workingDirectory
            ];
            PrivateTmp = true;
          };

          path = [
            hermesCfg.package
            pkgs.bash
            pkgs.coreutils
          ];
        };
      }

      # Auto-deploy Caddy + httpServices when bind.interface is set.
      (lib.mkIf bindActive {
        systemd.services.hermes-dashboard-caddy = {
          description = "Caddy reverse proxy for Hermes dashboard";
          wantedBy = ["multi-user.target"];
          after =
            ["hermes-dashboard.service"]
            ++ lib.optional (cfg.bind.netbirdClient != null)
            "netbird-${cfg.bind.netbirdClient}.service";
          wants =
            ["hermes-dashboard.service"]
            ++ lib.optional (cfg.bind.netbirdClient != null)
            "netbird-${cfg.bind.netbirdClient}.service";
          bindsTo = ["hermes-dashboard.service"];
          partOf = ["hermes-dashboard.service"];

          unitConfig = {
            ConditionPathExists = "/sys/class/net/${cfg.bind.interface}";
            StartLimitIntervalSec = 0;
          };

          serviceConfig = {
            Type = "simple";
            Restart = "on-failure";
            RestartSec = "5s";
            DynamicUser = true;
            StateDirectory = "hermes-dashboard-caddy";
            WorkingDirectory = "/var/lib/hermes-dashboard-caddy";
            Environment = ["HOME=/var/lib/hermes-dashboard-caddy"];
            NoNewPrivileges = true;
            ProtectSystem = "strict";
            PrivateTmp = true;
            ExecStart = caddyScript;
          };
        };

        httpServices.${cfg.expose.key} = {
          port = cfg.bind.port;
          expose = {
            enable = true;
            private = effectivePrivate;
            accessGroups = cfg.expose.accessGroups;
          };
          auth = {
            inherit (cfg.expose.auth) type distributionGroups passwordFile pin headers;
          };
        };

        networking.firewall.interfaces.${cfg.bind.interface} = {
          allowedTCPPorts = lib.mkAfter [cfg.bind.port];
        };
      })
    ]);
  };
}
