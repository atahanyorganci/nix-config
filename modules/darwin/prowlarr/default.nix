{
  config,
  lib,
  pkgs,
  user,
  ...
}: let
  inherit
    (lib)
    mkEnableOption
    mkOption
    types
    mkPackageOption
    mkIf
    ;
  cfg = config.services.prowlarr;
in {
  options = {
    services.prowlarr = {
      enable =
        mkEnableOption "prowlarr"
        // {
          description = ''
            Whether to enable Prowlarr, an indexer manager/proxy for Torrent trackers and Usenet indexers.

            Prowlarr can be controlled via the WebUI (http://127.0.0.1:9696/ by default).
          '';
        };
      package = mkPackageOption pkgs "prowlarr" {};
      dataDir = mkOption {
        type = types.path;
        default = "/Users/${user.username}/Library/Application Support/Prowlarr";
        defaultText = "/Users/\${user.username}/Library/Application Support/Prowlarr";
        description = "The directory where Prowlarr stores its data files.";
      };
      logDir = mkOption {
        type = types.path;
        default = "/Users/${user.username}/Library/Logs/Prowlarr";
        defaultText = "/Users/\${user.username}/Library/Logs/Prowlarr";
        description = "Directory where the Prowlarr logs will be stored.";
      };
      settings = mkOption {
        description = "Settings for Prowlarr configuration.";
        default = {};
        type = types.submodule {
          options = {
            bind-address = mkOption {
              type = types.str;
              default = "127.0.0.1";
              description = "The address to bind the web interface to.";
            };
            port = mkOption {
              type = types.port;
              default = 9696;
              description = "The port for the Prowlarr web interface.";
            };
          };
        };
      };
      extraFlags = mkOption {
        type = types.listOf types.str;
        default = [];
        example = ["-nobrowser"];
        description = "Extra flags passed to the Prowlarr command in the service definition.";
      };
    };
  };
  config = mkIf cfg.enable {
    # Create necessary directories during system activation
    system.activationScripts.postActivation.text = ''
      echo "Creating Prowlarr directories..."

      mkdir -p '${cfg.dataDir}' && chown -R '${user.username}' '${cfg.dataDir}'
      mkdir -p '${cfg.logDir}' && chown -R '${user.username}' '${cfg.logDir}'
    '';

    launchd.user.agents.prowlarr = {
      serviceConfig = {
        Label = "io.prowlarr.daemon";
        ProgramArguments =
          [
            "${lib.getExe cfg.package}"
            "-nobrowser"
            "-data=${cfg.dataDir}"
          ]
          ++ cfg.extraFlags;
        WorkingDirectory = cfg.dataDir;
        RunAtLoad = true;
        KeepAlive = {
          SuccessfulExit = false;
          Crashed = true;
        };
        StandardOutPath = "${cfg.logDir}/launchd-stdout.log";
        StandardErrorPath = "${cfg.logDir}/launchd-stderr.log";
        ProcessType = "Background";
        ThrottleInterval = 15;
        EnvironmentVariables = {
          PROWLARR__SERVER__PORT = builtins.toString cfg.settings.port;
          PROWLARR__SERVER__BINDADDRESS = cfg.settings.bind-address;
        };
      };
    };

    # Make Prowlarr available in PATH
    environment.systemPackages = [cfg.package];
  };
}
