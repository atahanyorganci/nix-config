{config, ...}: let
  infra = config.flake.infra;
in {
  flake.modules.darwin.netbird = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.netbird;
    controlPlaneHost = let
      match = builtins.match "^[^:]+://([^/:]+)(:[0-9]+)?(/.*)?$" cfg.managementUrl;
    in
      if match == null
      then throw "netbird.managementUrl must contain an HTTP(S) hostname"
      else builtins.elemAt match 0;
  in {
    options.netbird = {
      enable = lib.mkEnableOption "NetBird client (connect to self-hosted management)";

      managementUrl = lib.mkOption {
        type = lib.types.str;
        default = "https://${infra.netbirdManagementDomain}";
        description = "NetBird management service URL.";
      };

      setupKeyFile = lib.mkOption {
        type = lib.types.nullOr lib.types.str;
        default = null;
        example = "/var/lib/netbird-client/setup.key";
        description = ''
          Path to a setup key file for unattended login.
          Keep this outside the Nix store (e.g. under /var/lib).
        '';
      };

      package = lib.mkOption {
        type = lib.types.package;
        default = pkgs.netbird;
        defaultText = lib.literalExpression "pkgs.netbird";
        description = "NetBird client package (from flake overlay).";
      };
    };

    config = lib.mkIf cfg.enable {
      services.netbird = {
        enable = true;
        package = cfg.package;
      };

      # Merge onto the stock nix-darwin daemon env (keep NB_CONFIG / NB_LOG_FILE).
      launchd.daemons.netbird.serviceConfig.EnvironmentVariables = {
        NB_CONFIG = "/var/lib/netbird/config.json";
        NB_LOG_FILE = "console";
        NB_MANAGEMENT_URL = cfg.managementUrl;
        NB_ADMIN_URL = cfg.managementUrl;
      };

      launchd.daemons.netbird-login = lib.mkIf (cfg.setupKeyFile != null) {
        script = ''
          set -euo pipefail
          setupKeyFile=${lib.escapeShellArg cfg.setupKeyFile}
          netbird=${lib.escapeShellArg (lib.getExe cfg.package)}

          # Wait until an operator drops the setup key (kept outside the Nix store).
          until [ -s "$setupKeyFile" ]; do
            sleep 5
          done

          # Wait for the NetBird daemon socket to become usable.
          ready=0
          for _ in $(seq 1 60); do
            if "$netbird" status >/dev/null 2>&1; then
              ready=1
              break
            fi
            sleep 1
          done
          if [ "$ready" -ne 1 ]; then
            echo "netbird daemon not ready" >&2
            exit 1
          fi

          # The management URL is only printed with --detail; plain `status`
          # just says `Connected`, which would accept the wrong control plane.
          status_detail() {
            "$netbird" status --detail 2>/dev/null || :
          }

          # Already on the configured control plane: succeed so KeepAlive stops
          # restarting. Match the host alone, since the printed URL carries the
          # port.
          if status_detail | grep -q "Management: Connected to .*${controlPlaneHost}"; then
            exit 0
          fi

          # `netbird up` returns early with "Already connected" and ignores the
          # new URL while the daemon still holds a session, so drop it when the
          # client is connected to a different control plane.
          if status_detail | grep 'Management: Connected to ' | grep -qv ${lib.escapeShellArg controlPlaneHost}; then
            "$netbird" down || :
          fi

          exec "$netbird" up \
            --management-url ${lib.escapeShellArg cfg.managementUrl} \
            --setup-key-file "$setupKeyFile"
        '';
        serviceConfig = {
          RunAtLoad = true;
          # Restart after failed login; exit 0 (connected / successful up) stops retries.
          KeepAlive.SuccessfulExit = false;
          ThrottleInterval = 30;
          # Re-trigger promptly when the setup key directory changes.
          WatchPaths = [(builtins.dirOf cfg.setupKeyFile)];
          StandardOutPath = "/var/log/netbird-login.out.log";
          StandardErrorPath = "/var/log/netbird-login.err.log";
        };
      };
    };
  };
}
