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
  cfg = config.services.radarr;
in {
  options = {
    services.radarr = {
      enable =
        mkEnableOption "radarr"
        // {
          description = ''
            Whether to enable Radarr, a Usenet/BitTorrent movie downloader.

            Radarr can be controlled via the WebUI (http://127.0.0.1:7878/ by default).
          '';
        };
      package = mkPackageOption pkgs "radarr" {};
      dataDir = mkOption {
        type = types.path;
        default = "/Users/${user.username}/Library/Application Support/Radarr";
        defaultText = "/Users/\${user.username}/Library/Application Support/Radarr";
        description = "The directory where Radarr stores its data files.";
      };
      logDir = mkOption {
        type = types.path;
        default = "/Users/${user.username}/Library/Logs/Radarr";
        defaultText = "/Users/\${user.username}/Library/Logs/Radarr";
        description = "Directory where the Radarr logs will be stored.";
      };
      settings = mkOption {
        description = "Settings for Radarr configuration.";
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
              default = 7878;
              description = "The port for the Radarr web interface.";
            };
          };
        };
      };
      extraFlags = mkOption {
        type = types.listOf types.str;
        default = [];
        example = ["--nobrowser"];
        description = "Extra flags passed to the Radarr command in the service definition.";
      };
    };
  };
  config = mkIf cfg.enable {
    # Create necessary directories during system activation
    system.activationScripts.postActivation.text = ''
      echo "Creating Radarr directories..."

      mkdir -p '${cfg.dataDir}' && chown -R '${user.username}' '${cfg.dataDir}'
      mkdir -p '${cfg.logDir}' && chown -R '${user.username}' '${cfg.logDir}'
    '';

    launchd.user.agents.radarr = {
      serviceConfig = {
        Label = "io.radarr.daemon";
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
          RADARR__SERVER__PORT = builtins.toString cfg.settings.port;
          RADARR__SERVER__BINDADDRESS = cfg.settings.bind-address;
        };
      };
    };

    # Make Radarr available in PATH
    environment.systemPackages = [cfg.package];
  };
}
