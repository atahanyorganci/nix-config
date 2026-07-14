{
  flake.modules.darwin.omlx = {
    config,
    lib,
    pkgs,
    user,
    ...
  }: let
    inherit
      (lib)
      getExe
      mkEnableOption
      mkIf
      mkOption
      mkPackageOption
      optionalAttrs
      types
      ;
    cfg = config.services.omlx;
    home = "/Users/${user.username}";

    settingsFile = pkgs.writeText "omlx-settings.json" (builtins.toJSON {
      version = "1.0";
      server = {
        host = cfg.settings.host;
        port = cfg.settings.port;
        log_level = cfg.settings.log-level;
        # Menu bar app must not start its own server; launchd owns port.
        auto_start_on_launch = false;
      };
      model = {
        model_dirs = [cfg.modelDir];
        model_dir = cfg.modelDir;
      };
      memory = {
        memory_guard_tier = cfg.settings.memory-guard;
      };
      cache =
        {
          enabled = true;
          ssd_cache_dir = cfg.cacheDir;
        }
        // optionalAttrs (cfg.settings.ssd-cache-max-size != null) {
          ssd_cache_max_size = cfg.settings.ssd-cache-max-size;
        };
      auth = {
        skip_api_key_verification = cfg.settings.skip-api-key-verification;
      };
      logging = {
        log_dir = cfg.logDir;
      };
    });

    # Optional wrapper only when injecting an API key from a file.
    serveProgram =
      if cfg.apiKeyFile != null
      then
        pkgs.writeShellScript "omlx-serve" ''
          set -euo pipefail
          if [ ! -r '${cfg.apiKeyFile}' ]; then
            echo "omlx: apiKeyFile is not readable: ${cfg.apiKeyFile}" >&2
            exit 1
          fi
          export OMLX_API_KEY="$(tr -d '\n' < '${cfg.apiKeyFile}')"
          exec ${getExe cfg.package} "$@"
        ''
      else getExe cfg.package;
  in {
    options.services.omlx = {
      enable =
        mkEnableOption "oMLX inference server"
        // {
          description = ''
            Whether to run the oMLX multi-model inference server as a launchd user agent.

            Serves an OpenAI-compatible API (http://''${settings.host}:''${toString settings.port}/ by default).
          '';
        };
      package = mkPackageOption pkgs "omlx" {};
      configDir = mkOption {
        type = types.path;
        default = "${home}/.config/omlx";
        defaultText = "/Users/\${user.username}/.config/omlx";
        description = "XDG config directory (`settings.json`, passed as `--base-path`).";
      };
      modelDir = mkOption {
        type = types.path;
        default = "${home}/.local/share/omlx/models";
        defaultText = "/Users/\${user.username}/.local/share/omlx/models";
        description = "XDG data directory for model weights.";
      };
      cacheDir = mkOption {
        type = types.path;
        default = "${home}/.cache/omlx";
        defaultText = "/Users/\${user.username}/.cache/omlx";
        description = "XDG cache directory for the paged SSD prefix cache.";
      };
      logDir = mkOption {
        type = types.path;
        default = "${home}/.local/state/omlx/logs";
        defaultText = "/Users/\${user.username}/.local/state/omlx/logs";
        description = "XDG state directory for server and launchd logs.";
      };
      apiKeyFile = mkOption {
        type = types.nullOr types.path;
        default = null;
        example = "/Users/\${user.username}/.config/omlx/api-key";
        description = ''
          Optional path to a file containing the API key. Exported as `OMLX_API_KEY`
          at runtime so it is not baked into the Nix store or process argv.
          Unused when `settings.skip-api-key-verification` is true.
        '';
      };
      settings = mkOption {
        description = "Values written to `settings.json` by the activation script.";
        default = {};
        type = types.submodule {
          options = {
            host = mkOption {
              type = types.str;
              default = "0.0.0.0";
              description = "Address to bind the HTTP API to.";
            };
            port = mkOption {
              type = types.port;
              default = 8000;
              description = "Port for the HTTP API.";
            };
            log-level = mkOption {
              type = types.enum ["trace" "debug" "info" "warning" "error"];
              default = "info";
              description = "Server log level.";
            };
            memory-guard = mkOption {
              type = types.enum ["safe" "balanced" "aggressive"];
              default = "aggressive";
              description = ''
                Memory guard tier. `aggressive` allows oMLX to use more unified
                memory for MLX inference (less reserved for the rest of the system).
              '';
            };
            ssd-cache-max-size = mkOption {
              type = types.nullOr types.str;
              default = null;
              example = "22GB";
              description = "Maximum paged SSD cache size (e.g. `22GB`).";
            };
            skip-api-key-verification = mkOption {
              type = types.bool;
              default = true;
              description = ''
                Disable API key checks (and admin login). Intended when access is
                already gated by a private mesh (e.g. NetBird).
              '';
            };
          };
        };
      };
      extraFlags = mkOption {
        type = types.listOf types.str;
        default = [];
        example = ["--no-hf-cache"];
        description = "Extra flags passed to `omlx serve`.";
      };
    };

    config = mkIf cfg.enable {
      system.activationScripts.postActivation.text = ''
        echo "Creating oMLX XDG directories and settings..."
        mkdir -p '${cfg.configDir}' '${cfg.modelDir}' '${cfg.cacheDir}' '${cfg.logDir}'
        # oMLX rewrites settings.json at runtime; keep it user-writable.
        install -m 0644 '${settingsFile}' '${cfg.configDir}/settings.json'
        chown -R '${user.username}' \
          '${cfg.configDir}' \
          '${home}/.local/share/omlx' \
          '${cfg.cacheDir}' \
          '${home}/.local/state/omlx'
        # Menu bar / leftover serve must not hold :8000.
        if command -v pkill >/dev/null; then
          pkill -f '/Applications/oMLX.app/Contents/MacOS/oMLX' 2>/dev/null || true
          pkill -f '/Users/.*/Applications/oMLX.app/Contents/MacOS/oMLX' 2>/dev/null || true
        fi
      '';

      launchd.user.agents.omlx = {
        serviceConfig = {
          Label = "ai.omlx.server";
          ProgramArguments =
            [
              "${serveProgram}"
              "serve"
              "--base-path"
              cfg.configDir
              "--host"
              cfg.settings.host
              "--port"
              (builtins.toString cfg.settings.port)
            ]
            ++ cfg.extraFlags;
          WorkingDirectory = cfg.configDir;
          RunAtLoad = true;
          KeepAlive = {
            SuccessfulExit = false;
            Crashed = true;
          };
          StandardOutPath = "${cfg.logDir}/launchd-stdout.log";
          StandardErrorPath = "${cfg.logDir}/launchd-stderr.log";
          ProcessType = "Background";
          ThrottleInterval = 15;
          # Model weight files and the SSD cache open many descriptors.
          SoftResourceLimits.NumberOfFiles = 8192;
          HardResourceLimits.NumberOfFiles = 65535;
          EnvironmentVariables = {
            OMLX_BASE_PATH = cfg.configDir;
            XDG_CONFIG_HOME = "${home}/.config";
            XDG_DATA_HOME = "${home}/.local/share";
            XDG_CACHE_HOME = "${home}/.cache";
            XDG_STATE_HOME = "${home}/.local/state";
            # Quiet Metal / MLX chatter; keep server logs in launchd + server.log.
            MLX_DEBUG = "0";
          };
        };
      };

      environment.systemPackages = [cfg.package];
    };
  };
}
