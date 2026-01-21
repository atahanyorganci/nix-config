{ config
, lib
, pkgs
, user
, ...
}:

let
  inherit (lib)
    mkEnableOption
    mkOption
    types
    mkPackageOption
    mkIf
    ;
  cfg = config.services.transmission;
  settingsFormat = pkgs.formats.json { };
  settingsFile = settingsFormat.generate "settings.json" cfg.settings;
in
{
  options = {
    services.transmission = {
      enable = mkEnableOption "transmission" // {
        description = ''
          Whether to enable the headless Transmission BitTorrent daemon.

          Transmission daemon can be controlled via the RPC interface using
          transmission-remote, the WebUI (http://127.0.0.1:9091/ by default),
          or other clients like stig or tremc.
        '';
      };
      settings = mkOption {
        description = ''
          Settings whose options overwrite fields in `config/settings.json`
        '';
        default = { };
        type = types.submodule {
          options = {
            download-dir = mkOption {
              type = types.path;
              default = "/Users/${user.username}/Downloads";
              description = "Directory where to download torrents.";
            };
            incomplete-dir = mkOption {
              type = types.path;
              default = "/Users/${user.username}/Downloads/incomplete";
              description = "Directory where to download incomplete torrents.";
            };
            message-level = mkOption {
              type = types.ints.between 0 6;
              default = 2;
              description = "Set verbosity of transmission messages.";
            };
            rpc-bind-address = mkOption {
              type = types.str;
              default = "127.0.0.1";
              description = "Where to listen for RPC connections. Use `0.0.0.0` to listen on all interfaces.";
            };
            rpc-port = mkOption {
              type = types.port;
              default = 9091;
              description = "The RPC port to listen to.";
            };
            watch-dir = mkOption {
              type = types.path;
              default = "/Users/${user.username}/Downloads/torrents";
              description = "Watch a directory for torrent files and add them to transmission.";
            };
          };
        };
      };
      package = mkPackageOption pkgs "transmission_4" {
        example = "pkgs.transmission_4";
      };
      configDir = mkOption {
        type = types.path;
        default = "/Users/${user.username}/Library/Application Support/Transmission";
        description = "The directory where Transmission will store its configuration and data.";
      };
      logDir = mkOption {
        type = types.path;
        default = "/Users/${user.username}/Library/Logs/Transmission";
        description = "Directory where the Transmission logs will be stored.";
      };
      extraFlags = mkOption {
        type = types.listOf types.str;
        default = [ ];
        example = [ "--log-debug" ];
        description = "Extra flags passed to the transmission command in the service definition.";
      };
    };
  };

  config = mkIf cfg.enable {
    # Create necessary directories during system activation
    system.activationScripts.postActivation.text = ''
      echo "Creating Transmission directories..."

      mkdir -p '${cfg.configDir}' \
        && cp -f "${settingsFile}" '${cfg.configDir}/settings.json' \
        && chown -R '${user.username}' '${cfg.configDir}'
      mkdir -p '${cfg.logDir}' && chown -R '${user.username}' '${cfg.logDir}'
      mkdir -p '${cfg.settings.download-dir}' && chown -R '${user.username}' '${cfg.settings.download-dir}'
      mkdir -p '${cfg.settings.incomplete-dir}' && chown -R '${user.username}' '${cfg.settings.incomplete-dir}'
      mkdir -p '${cfg.settings.watch-dir}' && chown -R '${user.username}' '${cfg.settings.watch-dir}'
    '';

    launchd.user.agents.transmission = {
      serviceConfig = {
        Label = "com.transmissionbt.daemon";
        ProgramArguments = [
          "${cfg.package}/bin/transmission-daemon"
          "--foreground"
          "--config-dir"
          "${cfg.configDir}"
          "--logfile"
          "${cfg.logDir}/transmission.log"
          "--no-auth"
          "--port"
          "${builtins.toString cfg.settings.rpc-port}"
          "--bind-address-ipv4"
          "${cfg.settings.rpc-bind-address}"
          "--download-dir"
          "${cfg.settings.download-dir}"
          "--incomplete-dir"
          "${cfg.settings.incomplete-dir}"
          "--watch-dir"
          "${cfg.settings.watch-dir}"
        ] ++ cfg.extraFlags;
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
      };
    };
    # Make transmission CLI tools available in PATH
    environment.systemPackages = [ cfg.package ];
  };
}
