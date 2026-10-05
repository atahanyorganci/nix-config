{
  config,
  inputs,
  ...
}: let
  infra = config.flake.infra;
  catalog = config.flake.agentGateway;
in {
  flake.modules.nixos.agent-gateway = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.agent-gateway;

    user = "agent-gateway";
    stateDir = "/var/lib/agent-gateway";
    credentialsFile = "${stateDir}/credentials.json";

    wildcardHosts = ["0.0.0.0" "::" "[::]"];
    loopbackHosts = ["127.0.0.1" "localhost" "::1"];
    isLoopback = builtins.elem cfg.host loopbackHosts;
    # The NetBird proxy reaches an Agent Network provider from its own host,
    # so the listener has to answer on loopback.
    loopbackUpstream =
      if cfg.host == "::1"
      then "http://[::1]:${toString cfg.port}"
      else "http://127.0.0.1:${toString cfg.port}";

    # A wildcard bind has no address to dial, so probe over loopback.
    healthHost =
      if builtins.elem cfg.host wildcardHosts
      then "127.0.0.1"
      else cfg.host;
    # The gateway has no dedicated health route; `/v1/models` answers without
    # credentials and only once the listener is up.
    healthUrl = "http://${healthHost}:${toString cfg.port}/v1/models";

    # Prefixed with `-` in ExecStartPost: it reports readiness into the journal
    # without turning a slow first start into a restart loop.
    healthCheck = pkgs.writeShellScript "agent-gateway-health" ''
      set -uo pipefail
      for _ in $(${pkgs.coreutils}/bin/seq 60); do
        if ${pkgs.curl}/bin/curl --silent --fail --max-time 2 ${lib.escapeShellArg healthUrl} >/dev/null; then
          echo "agent-gateway: gateway healthy at ${healthUrl}"
          exit 0
        fi
        ${pkgs.coreutils}/bin/sleep 1
      done
      echo "agent-gateway: ${healthUrl} did not answer within 60s" >&2
      exit 1
    '';
  in {
    options.agent-gateway = {
      enable = lib.mkEnableOption "`agent gateway`, the OpenAI-compatible LLM gateway";

      package = lib.mkOption {
        type = lib.types.package;
        default = inputs.agent.packages.${pkgs.stdenv.hostPlatform.system}.agent;
        defaultText = lib.literalExpression "inputs.agent.packages.\${system}.agent";
        description = "The `agent` package whose `gateway` command is run.";
      };

      host = lib.mkOption {
        type = lib.types.str;
        default = "127.0.0.1";
        example = "0.0.0.0";
        description = ''
          Address the gateway binds to. The gateway does not authenticate its
          callers, so the loopback default keeps it host-local; widen it only
          together with `interfaces` and `expose`.
        '';
      };

      port = lib.mkOption {
        type = lib.types.port;
        default = 3000;
        description = "TCP port serving the `/v1` endpoints.";
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
        type = lib.types.enum ["trace" "debug" "info" "warn" "error" "fatal"];
        default = "info";
        description = "Minimum level logged to the journal (`AGENT_LOG_LEVEL`).";
      };

      logFormat = lib.mkOption {
        type = lib.types.enum ["text" "json"];
        default = "json";
        description = ''
          Log line format (`AGENT_LOG_FORMAT`). JSON keeps annotations such as
          the upstream connection id as structured fields.
        '';
      };

      environmentFile = lib.mkOption {
        type = lib.types.nullOr lib.types.path;
        default = null;
        example = "/run/secrets/agent-gateway.env";
        description = ''
          `EnvironmentFile` for the unit, kept out of the world-readable store.
          Useful for `OTEL_EXPORTER_OTLP_ENDPOINT` and its headers.
        '';
      };

      expose = {
        enable = lib.mkEnableOption "publishing the gateway through the NetBird reverse proxy";

        key = lib.mkOption {
          type = lib.types.str;
          default = "agent";
          example = "ai";
          description = "httpServices key, which becomes `https://<key>.${infra.domain}`.";
        };

        accessGroups = lib.mkOption {
          type = lib.types.listOf lib.types.str;
          default = [];
          example = ["Admin"];
          description = ''
            NetBird groups allowed to reach the gateway. Empty falls back to
            the stack default for a private service, which is Admin.
          '';
        };
      };

      agentNetwork = {
        enable = lib.mkEnableOption ''
          registering the gateway as a NetBird Agent Network provider, served
          through the account's Agent Network endpoint alongside (not instead
          of) `expose`. NetBird's proxy dials it over loopback, so this host
          has to run `netbird-proxy`
        '';

        name = lib.mkOption {
          type = lib.types.str;
          default = "agent-gateway";
          description = "Provider name in NetBird, which `flake.agentNetwork.policies` refer to.";
        };

        catalogId = lib.mkOption {
          type = lib.types.str;
          # NetBird's entry for solo.io's agentgateway, not this gateway. It is
          # generic: OpenAI-shaped requests pass through untouched, models are
          # listed from `/v1/models`, and the caller's identity arrives as
          # `x-netbird-user-id` and `x-netbird-groups`.
          default = "agentgateway";
          description = "NetBird catalog entry the provider is registered as.";
        };

        models = lib.mkOption {
          type = lib.types.listOf lib.types.str;
          default = map (model: model.id) (lib.filter (model: lib.elem "agents" model.audience) catalog.models);
          defaultText = lib.literalExpression ''ids of the `flake.agentGateway.models` whose audience includes "agents"'';
          description = "Models offered through the Agent Network endpoint; NetBird refuses any other.";
        };
      };
    };

    config = lib.mkIf cfg.enable {
      assertions = [
        {
          assertion = cfg.port >= 1024;
          message = ''
            agent-gateway.port = ${toString cfg.port} is privileged, but the unit
            runs unprivileged with an empty capability set. Pick a port >= 1024.
          '';
        }
        {
          assertion = !cfg.agentNetwork.enable || (config.netbird-proxy.enable && config.netbird-proxy.private);
          message = ''
            agent-gateway.agentNetwork.enable needs a private NetBird proxy on this
            host (netbird-proxy.enable and netbird-proxy.private): the Agent Network
            endpoint is a private service, and its proxy dials ${loopbackUpstream}.
          '';
        }
        {
          assertion = !cfg.agentNetwork.enable || isLoopback || builtins.elem cfg.host wildcardHosts;
          message = ''
            agent-gateway.agentNetwork.enable needs the gateway to answer on loopback,
            where the NetBird proxy dials it, but agent-gateway.host = "${cfg.host}".
            Use a loopback or wildcard address.
          '';
        }
        {
          assertion = !cfg.expose.enable || !isLoopback;
          message = ''
            agent-gateway.expose.enable needs a listener the reverse proxy can
            dial, but agent-gateway.host = "${cfg.host}" is loopback. Bind the
            mesh interface (or "0.0.0.0" plus agent-gateway.interfaces) instead.
          '';
        }
      ];

      warnings =
        lib.optional (cfg.expose.enable && cfg.interfaces == []) ''
          agent-gateway.expose.enable publishes ${cfg.expose.key}.${infra.domain},
          but agent-gateway.interfaces is empty, so the firewall drops the reverse
          proxy's connection to port ${toString cfg.port}. Add the mesh interface.
        ''
        ++ lib.optional (!isLoopback && !cfg.expose.enable) ''
          agent-gateway.host = "${cfg.host}" serves the gateway beyond this host,
          and the gateway does not authenticate its callers. Anyone who can reach
          port ${toString cfg.port} on agent-gateway.interfaces can spend the
          accounts in its credentials file.
        '';

      # Static rather than DynamicUser: the credentials file is copied in by
      # hand, so it needs an owner that exists before the unit has ever run.
      users.users.${user} = {
        isSystemUser = true;
        group = user;
        home = stateDir;
      };
      users.groups.${user} = {};

      # StateDirectory only appears when the unit starts, and the unit does not
      # start until the credentials are in place, so create it up front.
      systemd.tmpfiles.rules = [
        "d ${stateDir} 0700 ${user} ${user} -"
      ];

      systemd.services.agent-gateway = {
        description = "agent gateway, an OpenAI-compatible LLM gateway";
        documentation = ["https://github.com/atahanyorganci/agent"];
        wantedBy = ["multi-user.target"];
        after = ["network-online.target"];
        wants = ["network-online.target"];

        # The credentials file is provisioned by hand. Until it is, skip the
        # start instead of serving no models (or failing in a restart loop):
        # a skipped condition is neither a failure nor a deploy error. After
        # copying it in, `systemctl start agent-gateway`; after replacing it,
        # restart, since the gateway does not reload the file.
        unitConfig.ConditionFileNotEmpty = credentialsFile;

        environment = {
          AGENT_HOST = cfg.host;
          AGENT_PORT = toString cfg.port;
          # Named explicitly so it must exist, and so OAuth rotations are
          # written back here (a temporary file renamed over it, hence the
          # writable state directory).
          AGENT_CREDENTIALS = credentialsFile;
          # Must exist; a missing `config.json` in it is an empty configuration.
          # Pinned so nothing is read from `$HOME/.config`.
          AGENT_CONFIG_DIR = stateDir;
          AGENT_LOG_LEVEL = cfg.logLevel;
          AGENT_LOG_FORMAT = cfg.logFormat;
          HOME = stateDir;
        };

        serviceConfig = {
          Type = "exec";
          ExecStart = "${lib.getExe cfg.package} gateway";
          ExecStartPost = "-${healthCheck}";
          EnvironmentFile = lib.mkIf (cfg.environmentFile != null) cfg.environmentFile;
          Restart = "on-failure";
          RestartSec = "5s";
          StandardInput = "null";

          User = user;
          Group = user;
          StateDirectory = "agent-gateway";
          StateDirectoryMode = "0700";
          WorkingDirectory = stateDir;
          UMask = "0077";

          AmbientCapabilities = [""];
          CapabilityBoundingSet = [""];
          LockPersonality = true;
          NoNewPrivileges = true;
          PrivateDevices = true;
          # Writable and private: the executable unpacks its embedded native
          # binding into the temporary directory as it starts.
          PrivateTmp = true;
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
          # JavaScriptCore maps its JIT pages writable and then executable; the
          # usual W^X lockdown makes Bun abort before it reaches the gateway.
          MemoryDenyWriteExecute = false;
        };
      };

      networking.firewall.interfaces = lib.genAttrs cfg.interfaces (_: {
        allowedTCPPorts = [cfg.port];
      });

      # Loopback needs no firewall opening: the proxy dials it directly.
      agentNetworkProviders = lib.mkIf cfg.agentNetwork.enable {
        ${cfg.agentNetwork.name} = {
          inherit (cfg.agentNetwork) catalogId models;
          upstreamUrl = loopbackUpstream;
        };
      };

      # Always private: the gateway passes every caller through and holds
      # long-lived provider credentials, so NetBird's identity layer is the only
      # authorisation in front of it. The proxy adds no auth of its own.
      httpServices = lib.mkIf cfg.expose.enable {
        ${cfg.expose.key} = {
          inherit (cfg) port;
          expose = {
            enable = true;
            private = true;
            inherit (cfg.expose) accessGroups;
          };
          auth.type = "none";
        };
      };
    };
  };
}
