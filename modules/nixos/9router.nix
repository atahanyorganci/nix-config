{
  flake.modules.nixos."9router" = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config."9router";

    stateDir = "/var/lib/9router";

    wildcardHosts = ["0.0.0.0" "::" "[::]"];
    loopbackHosts = ["127.0.0.1" "localhost" "::1"];
    isLoopback = builtins.elem cfg.host loopbackHosts;

    # A wildcard bind has no address to dial, so probe over loopback.
    healthHost =
      if builtins.elem cfg.host wildcardHosts
      then "127.0.0.1"
      else cfg.host;
    healthUrl = "http://${healthHost}:${toString cfg.port}/api/health";

    # `9router` is a launcher: it starts the Next.js standalone server as a
    # child process and then draws an interactive menu. On a non-TTY stdin it
    # falls back to "tray mode", which skips the menu and only supervises the
    # child — the shape a unit wants — but that fallback is gated on
    # `--skip-update`, so the flag is load-bearing beyond its name here.
    args = [
      "--host"
      cfg.host
      "--port"
      (toString cfg.port)
      # Headless host: there is no browser and no system tray to open.
      "--no-browser"
      # Never query the npm registry for a newer release. Nix owns the version,
      # and the in-app updater would try to npm-install over the store path.
      "--skip-update"
      # Without this the launcher swallows the server's stdout and only replays
      # the last 50 lines after a crash. With it every request the gateway
      # proxies (see `logLevel`) reaches the journal as it happens.
      "--log"
    ];

    # `/api/health` is unauthenticated by design (see the dashboard guard's
    # public-path list), so this needs no credentials. Prefixed with `-` in
    # ExecStartPost: it reports readiness into the journal without turning a
    # slow first start into a restart loop.
    healthCheck = pkgs.writeShellScript "9router-health" ''
      set -uo pipefail
      for _ in $(${pkgs.coreutils}/bin/seq 60); do
        if ${pkgs.curl}/bin/curl --silent --fail --max-time 2 ${lib.escapeShellArg healthUrl} >/dev/null; then
          echo "9router: gateway healthy at ${healthUrl}"
          exit 0
        fi
        ${pkgs.coreutils}/bin/sleep 1
      done
      echo "9router: ${healthUrl} did not answer within 60s" >&2
      exit 1
    '';
  in {
    options."9router" = {
      enable = lib.mkEnableOption "9router, an LLM gateway fronting 40+ providers";

      package = lib.mkOption {
        type = lib.types.package;
        default = pkgs."9router";
        defaultText = lib.literalExpression ''pkgs."9router"'';
        description = "The 9router package to run.";
      };

      host = lib.mkOption {
        type = lib.types.str;
        default = "127.0.0.1";
        example = "0.0.0.0";
        description = ''
          Address the gateway binds to. The loopback default keeps the
          dashboard and the `/v1` endpoints reachable only from this host;
          widen it together with `interfaces` and `environmentFile`.
        '';
      };

      port = lib.mkOption {
        type = lib.types.port;
        default = 20128;
        description = "TCP port serving both the `/v1` gateway and the dashboard.";
      };

      interfaces = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [];
        example = ["nb-wt0"];
        description = ''
          Interfaces to open `port` on. The firewall stays closed everywhere
          else, so an empty list leaves the gateway host-local even when `host`
          is a wildcard.
        '';
      };

      logLevel = lib.mkOption {
        type = lib.types.enum ["debug" "info" "warn" "error"];
        default = "info";
        description = ''
          Verbosity of the per-request log the gateway writes while proxying
          completions. Errors are printed at every level.
        '';
      };

      requestLogs = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = ''
          Enable the dashboard's request-log view, which records prompts and
          responses in full. Off by default: it persists conversation content
          to the state directory.
        '';
      };

      observability = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = ''
          Record per-request metadata (provider, model, latency, token counts)
          for the dashboard's usage views.
        '';
      };

      environmentFile = lib.mkOption {
        type = lib.types.nullOr lib.types.path;
        default = null;
        example = "/run/secrets/9router.env";
        description = ''
          `EnvironmentFile` for the unit, kept out of the world-readable store.

          Useful keys: `INITIAL_PASSWORD` overrides the built-in default
          dashboard password (`123456`) that applies until one is set from the
          UI; `JWT_SECRET` pins dashboard sessions and `API_KEY_SECRET` pins
          issued API keys so neither is invalidated by a state reset.
        '';
      };
    };

    config = lib.mkIf cfg.enable {
      assertions = [
        {
          assertion = cfg.port >= 1024;
          message = ''
            9router.port = ${toString cfg.port} is privileged, but the unit runs
            unprivileged with an empty capability set. Pick a port >= 1024 and
            put a reverse proxy in front of it.
          '';
        }
      ];

      warnings = lib.optional (!isLoopback && cfg.environmentFile == null) ''
        9router.host = "${cfg.host}" serves the dashboard beyond this host while
        the login password is still the built-in default ("123456"). Set
        9router.environmentFile with INITIAL_PASSWORD=..., or change the
        password from the dashboard before the port becomes reachable.
      '';

      systemd.services."9router" = {
        description = "9router LLM gateway";
        documentation = ["https://github.com/decolua/9router"];
        wantedBy = ["multi-user.target"];
        after = ["network-online.target"];
        wants = ["network-online.target"];

        environment = {
          # Everything the gateway persists — the SQLite database, the machine
          # id, the CLI secret, provider OAuth tokens — follows DATA_DIR, so
          # nothing lands in the fallback `$HOME/.9router`.
          DATA_DIR = stateDir;
          HOME = stateDir;
          LOG_LEVEL = lib.toUpper cfg.logLevel;
          ENABLE_REQUEST_LOGS = lib.boolToString cfg.requestLogs;
          OBSERVABILITY_ENABLED = lib.boolToString cfg.observability;
          NEXT_TELEMETRY_DISABLED = "1";
        };

        # `ps` and `kill` for the launcher's "reap a leftover server" pass.
        # `npm` is deliberately absent: the launcher tries to install
        # better-sqlite3 and a tray helper into DATA_DIR on every start, and
        # neither is needed — nixpkgs already built better-sqlite3 into the
        # package's hoisted node_modules, where node resolves it by walking up
        # from `app/`, and there is no tray on a server.
        path = [
          pkgs.coreutils
          pkgs.procps
        ];

        serviceConfig = {
          Type = "exec";
          ExecStart = "${lib.getExe cfg.package} ${lib.escapeShellArgs args}";
          ExecStartPost = "-${healthCheck}";
          EnvironmentFile = lib.mkIf (cfg.environmentFile != null) cfg.environmentFile;
          # Not `on-failure`. The dashboard can shut the gateway down on
          # purpose: the header menu has a Shutdown item, and the update banner
          # ends its flow the same way, both POSTing /api/version/shutdown,
          # which calls process.exit(0). The launcher forwards a zero exit from
          # its child, so `on-failure` leaves the service dead until someone
          # starts it by hand. (The update itself is a no-op here — it only
          # prints an `npm i -g` line for a package Nix owns.)
          Restart = "always";
          RestartSec = "5s";
          # The launcher only reads stdin to decide whether it can draw its
          # interactive menu; a null stdin is what puts it in supervisor mode.
          StandardInput = "null";

          DynamicUser = true;
          StateDirectory = "9router";
          StateDirectoryMode = "0700";
          WorkingDirectory = stateDir;
          UMask = "0077";

          AmbientCapabilities = [""];
          CapabilityBoundingSet = [""];
          LockPersonality = true;
          NoNewPrivileges = true;
          PrivateDevices = true;
          PrivateTmp = true;
          PrivateUsers = true;
          ProtectClock = true;
          ProtectControlGroups = true;
          ProtectHome = true;
          ProtectHostname = true;
          ProtectKernelLogs = true;
          ProtectKernelModules = true;
          ProtectKernelTunables = true;
          ProtectProc = "invisible";
          ProtectSystem = "strict";
          RemoveIPC = true;
          RestrictAddressFamilies = [
            "AF_UNIX"
            "AF_INET"
            "AF_INET6"
            # glibc opens a netlink socket from getaddrinfo (source-address
            # selection) and getifaddrs; without it, resolving a provider's
            # host fails.
            "AF_NETLINK"
          ];
          RestrictNamespaces = true;
          RestrictRealtime = true;
          RestrictSUIDSGID = true;
          SystemCallArchitectures = "native";
          SystemCallFilter = [
            "@system-service"
            "~@privileged"
          ];
          # V8 maps its JIT pages writable and then executable; the usual W^X
          # lockdown makes node abort before it reaches the gateway.
          MemoryDenyWriteExecute = false;
        };
      };

      networking.firewall.interfaces = lib.genAttrs cfg.interfaces (_: {
        allowedTCPPorts = [cfg.port];
      });
    };
  };
}
