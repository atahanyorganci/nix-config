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
  cfg = config.services.sonarr;
in {
  options = {
    services.sonarr = {
      enable =
        mkEnableOption "sonarr"
        // {
          description = ''
            Whether to enable the Sonarr PVR for Usenet and BitTorrent users.

            Sonarr can be controlled via the WebUI (http://127.0.0.1:8989/ by default).
          '';
        };
      package = mkPackageOption pkgs "sonarr" {};
      dataDir = mkOption {
        type = types.path;
        default = "/Users/${user.username}/Library/Application Support/Sonarr";
        defaultText = "/Users/\${user.username}/Library/Application Support/Sonarr";
        description = "The directory where Sonarr stores its data files.";
      };
      logDir = mkOption {
        type = types.path;
        default = "/Users/${user.username}/Library/Logs/Sonarr";
        defaultText = "/Users/\${user.username}/Library/Logs/Sonarr";
        description = "Directory where the Sonarr logs will be stored.";
      };
      settings = mkOption {
        description = "Settings for Sonarr configuration.";
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
              default = 8989;
              description = "The port for the Sonarr web interface.";
            };
          };
        };
      };
      extraFlags = mkOption {
        type = types.listOf types.str;
        default = [];
        example = ["--nobrowser"];
        description = "Extra flags passed to the Sonarr command in the service definition.";
      };
    };
  };
  config = mkIf cfg.enable {
    # Create necessary directories during system activation
    system.activationScripts.postActivation.text = ''
      echo "Creating Sonarr directories..."

      mkdir -p '${cfg.dataDir}' && chown -R '${user.username}' '${cfg.dataDir}'
      mkdir -p '${cfg.logDir}' && chown -R '${user.username}' '${cfg.logDir}'
    '';

    launchd.user.agents.sonarr = {
      serviceConfig = {
        Label = "io.sonarr.daemon";
        ProgramArguments =
          [
            "${lib.getExe cfg.package}"
            "--nobrowser"
            "--data=${cfg.dataDir}"
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
          SONARR__SERVER__PORT = builtins.toString cfg.settings.port;
          SONARR__SERVER__BINDADDRESS = cfg.settings.bind-address;
        };
      };
    };

    # Make Sonarr available in PATH
    environment.systemPackages = [cfg.package];
  };
}
