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

          # Already joined: succeed so KeepAlive stops restarting.
          if "$netbird" status 2>/dev/null | grep -qiE 'Management:[[:space:]]+Connected'; then
            exit 0
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
