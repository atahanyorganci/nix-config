{ config
, pkgs
, lib
, user
, ...
}:
let
  inherit (lib)
    mkIf
    getExe
    mkEnableOption
    mkOption
    mkPackageOption
    ;
  inherit (lib.types) path;
  cfg = config.services.jellyfin;
in
{
  options = {
    services.jellyfin = {
      enable = mkEnableOption "Jellyfin Media Server";
      package = mkPackageOption pkgs "jellyfin" { };
      dataDir = mkOption {
        type = path;
        default = "/Users/${user.username}/Library/Application Support/Jellyfin";
        defaultText = "/Users/${user.username}/Library/Application Support/Jellyfin";
        description = ''
          Base data directory,
          passed with `--datadir` see [#data-directory](https://jellyfin.org/docs/general/administration/configuration/#data-directory)
        '';
      };
      configDir = mkOption {
        type = path;
        default = "${cfg.dataDir}/config";
        defaultText = "\${cfg.dataDir}/config";
        description = ''
          Directory containing the server configuration files,
          passed with `--configdir` see [configuration-directory](https://jellyfin.org/docs/general/administration/configuration/#configuration-directory)
        '';
      };
      cacheDir = mkOption {
        type = path;
        default = "/Users/${user.username}/Library/Caches/Jellyfin";
        defaultText = "/Users/${user.username}/Library/Caches/Jellyfin";
        description = ''
          Directory containing the jellyfin server cache,
          passed with `--cachedir` see [#cache-directory](https://jellyfin.org/docs/general/administration/configuration/#cache-directory)
        '';
      };
      logDir = mkOption {
        type = path;
        default = "/Users/${user.username}/Library/Logs/Jellyfin";
        defaultText = "/Users/${user.username}/Library/Logs/Jellyfin";
        description = ''
          Directory where the Jellyfin logs will be stored,
          passed with `--logdir` see [#log-directory](https://jellyfin.org/docs/general/administration/configuration/#log-directory)
        '';
      };
    };
  };

  config = mkIf cfg.enable {
    # Create necessary directories during system activation
    system.activationScripts.postActivation.text = ''
      echo "Creating Jellyfin directories..."
      mkdir -p '${cfg.dataDir}' && chown -R '${user.username}' '${cfg.dataDir}'
      mkdir -p '${cfg.configDir}' && chown -R '${user.username}' '${cfg.configDir}'
      mkdir -p '${cfg.cacheDir}' && chown -R '${user.username}' '${cfg.cacheDir}'
      mkdir -p '${cfg.logDir}' && chown -R '${user.username}' '${cfg.logDir}'
    '';

    launchd.user.agents.jellyfin = {
      serviceConfig = {
        Label = "org.jellyfin.server";
        ProgramArguments = [
          "${getExe cfg.package}"
          "--datadir"
          "${cfg.dataDir}"
          "--configdir"
          "${cfg.configDir}"
          "--cachedir"
          "${cfg.cacheDir}"
          "--logdir"
          "${cfg.logDir}"
        ];
        WorkingDirectory = "${cfg.dataDir}";
        RunAtLoad = true;
        KeepAlive = {
          SuccessfulExit = false;
          Crashed = true;
        };
        StandardOutPath = "${cfg.logDir}/launchd-stdout.log";
        StandardErrorPath = "${cfg.logDir}/launchd-stderr.log";
        ProcessType = "Background";
        # Equivalent to systemd's Restart = on-failure with TimeoutSec = 15
        ThrottleInterval = 15;
      };
    };
  };
}
