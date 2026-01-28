{
  config,
  lib,
  pkgs,
  user,
  ...
}: let
  cfg = config.calibre-web;
  dataDir = "/Users/${user.username}/Library/Application Support/calibre-web";
  cacheDir = "/Users/${user.username}/Library/Caches/calibre-web";
  logDir = "/Users/${user.username}/Library/Logs/calibre-web";

  inherit
    (lib)
    concatStringsSep
    getExe
    mkEnableOption
    mkIf
    mkOption
    mkPackageOption
    optional
    optionals
    optionalString
    types
    ;

  appDb = "${dataDir}/app.db";
  gdriveDb = "${dataDir}/gdrive.db";
  settings = concatStringsSep ", " (
    [
      "config_port = ${toString cfg.listen.port}"
      "config_uploading = ${
        if cfg.options.enableBookUploading
        then "1"
        else "0"
      }"
      "config_allow_reverse_proxy_header_login = ${
        if cfg.options.reverseProxyAuth.enable
        then "1"
        else "0"
      }"
      "config_reverse_proxy_login_header_name = '${cfg.options.reverseProxyAuth.header}'"
      "config_logfile = '${logDir}/calibre-web.log'"
    ]
    ++ optional (
      cfg.options.calibreLibrary != null
    ) "config_calibre_dir = '${cfg.options.calibreLibrary}'"
    ++ optionals cfg.options.enableBookConversion [
      "config_converterpath = '${pkgs.calibre}/bin/ebook-convert'"
      "config_binariesdir = '${pkgs.calibre}/bin/'"
    ]
    ++ optional cfg.options.enableKepubify "config_kepubifypath = '${pkgs.kepubify}/bin/kepubify'"
  );

  startupScript = pkgs.writeShellScript "calibre-web-startup" ''
    # Run migrations
    __RUN_MIGRATIONS_AND_EXIT=1 ${getExe cfg.package} -p "${appDb}" -g "${gdriveDb}"

    # Update settings in database
    ${pkgs.sqlite}/bin/sqlite3 "${appDb}" "update settings set ${settings}"

    ${optionalString (cfg.options.calibreLibrary != null) ''
      # Verify Calibre library
      test -f "${cfg.options.calibreLibrary}/metadata.db" || {
        echo "Invalid Calibre library: ${cfg.options.calibreLibrary}/metadata.db not found" >&2
        exit 1
      }
    ''}

    # Start Calibre-Web
    exec ${getExe cfg.package} -p "${appDb}" -g "${gdriveDb}" -i ${cfg.listen.ip}
  '';
in {
  options.calibre-web = {
    enable = mkEnableOption "Calibre-Web";
    package = mkPackageOption pkgs "calibre-web" {};
    listen = {
      ip = mkOption {
        type = types.str;
        default = "127.0.0.1";
        description = ''
          IP address that Calibre-Web should listen on.
        '';
      };
      port = mkOption {
        type = types.port;
        default = 8083;
        description = ''
          Listen port for Calibre-Web.
        '';
      };
    };
    options = {
      calibreLibrary = mkOption {
        type = types.nullOr types.path;
        default = null;
        description = ''
          Path to Calibre library.
        '';
      };
      enableBookConversion = mkOption {
        type = types.bool;
        default = false;
        description = ''
          Configure path to the Calibre's ebook-convert in the DB.
        '';
      };
      enableKepubify = mkEnableOption "kepub conversion support";
      enableBookUploading = mkOption {
        type = types.bool;
        default = false;
        description = ''
          Allow books to be uploaded via Calibre-Web UI.
        '';
      };
      reverseProxyAuth = {
        enable = mkOption {
          type = types.bool;
          default = false;
          description = ''
            Enable authorization using auth proxy.
          '';
        };
        header = mkOption {
          type = types.str;
          default = "";
          description = ''
            Auth proxy header name.
          '';
        };
      };
    };
  };
  config = mkIf cfg.enable {
    system.activationScripts.postActivation.text = ''
      echo "Creating Calibre-Web directories..."
      mkdir -p '${dataDir}' && chown -R '${user.username}' '${dataDir}'
      mkdir -p '${cacheDir}' && chown -R '${user.username}' '${cacheDir}'
      mkdir -p '${logDir}' && chown -R '${user.username}' '${logDir}'
    '';
    launchd.user.agents.calibre-web = {
      serviceConfig = {
        Label = "org.calibre-web.server";
        ProgramArguments = ["${startupScript}"];
        WorkingDirectory = "${dataDir}";
        RunAtLoad = true;
        KeepAlive = {
          SuccessfulExit = false;
          Crashed = true;
        };
        StandardOutPath = "${logDir}/launchd-stdout.log";
        StandardErrorPath = "${logDir}/launchd-stderr.log";
        ProcessType = "Background";
        # Equivalent to systemd's Restart = on-failure with timeout
        ThrottleInterval = 15;
        EnvironmentVariables = {
          CACHE_DIR = cacheDir;
        };
      };
    };
    environment.systemPackages = [cfg.package];
  };
}
