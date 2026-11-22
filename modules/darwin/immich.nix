# Immich on macOS: launchd agents in the primary user's GUI session.
#
# - immich-postgres: Postgres with pgvector and VectorChord, on local disk
#   (Immich: never a network share). It listens on a Unix socket only, in a
#   directory only the user can enter, and trusts it.
# - immich-valkey: job queue, Unix socket, nothing persisted.
# - immich-ml: machine learning on loopback (ONNX Runtime picks CoreML).
# - immich-server: the server, through the privacy-grant launcher
#   (`tccLauncher`), as the media location is usually a network volume. It
#   waits for that to be mounted and for Postgres, then starts. The media
#   location's `.immich` markers stop it from writing into an empty mount
#   point.
#
# Agents rather than daemons: they run in the session whose Kerberos tickets
# mount `sec=krb5` NFS shares, and macOS can ask that session for privacy
# grants. The user must therefore be logged in (as for the other services).
{
  flake.modules.darwin.immich = {
    config,
    lib,
    pkgs,
    user,
    ...
  }: let
    cfg = config.services.immich;
    inherit (lib) concatStringsSep escapeShellArg getExe mapAttrsToList mkEnableOption mkIf mkOption mkPackageOption optionalAttrs types;

    home = "/Users/${user.username}";
    pgdata = "${cfg.stateDir}/postgres";
    socketDir = cfg.runtimeDir;
    valkeySocket = "${socketDir}/valkey.sock";
    db = cfg.database.package;
    labelPrefix = "dev.yorganci.immich";

    configFile = pkgs.writeText "immich-config.json" (builtins.toJSON cfg.settings);

    environment =
      {
        DB_URL = "postgresql://${cfg.database.user}@localhost/${cfg.database.name}?host=${socketDir}";
        REDIS_SOCKET = valkeySocket;
        IMMICH_HOST = cfg.host;
        IMMICH_PORT = toString cfg.port;
        IMMICH_MEDIA_LOCATION = cfg.mediaLocation;
        IMMICH_MACHINE_LEARNING_URL =
          if cfg.machineLearning.enable
          then "http://127.0.0.1:${toString cfg.machineLearning.port}"
          else "false";
        # pg_dumpall and gzip for database backups, restic for Immich's
        # backup feature; the package adds exiftool, ffmpeg and perl.
        PATH = "${lib.makeBinPath [db pkgs.gzip pkgs.restic]}:/usr/bin:/bin:/usr/sbin:/sbin";
      }
      // optionalAttrs (cfg.settings != null) {IMMICH_CONFIG_FILE = "${configFile}";}
      // cfg.environment;

    exports = concatStringsSep "\n" (mapAttrsToList (k: v: "export ${k}=${escapeShellArg v}") environment);

    postgresStart = pkgs.writeShellScript "immich-postgres" ''
      set -eu
      umask 077
      mkdir -p ${escapeShellArg socketDir}
      if [ ! -s ${escapeShellArg "${pgdata}/PG_VERSION"} ]; then
        echo "Initialising the Immich database cluster..."
        ${db}/bin/initdb -D ${escapeShellArg pgdata} -U ${cfg.database.user} -A trust -E UTF8 --locale=C
      fi
      exec ${db}/bin/postgres -D ${escapeShellArg pgdata} \
        -k ${escapeShellArg socketDir} \
        -c listen_addresses= \
        -c shared_preload_libraries=vchord \
        -c 'search_path="$user", public, vectors'
    '';

    serverStart = pkgs.writeShellScript "immich-server" ''
      set -u
      media=${escapeShellArg cfg.mediaLocation}
      ${lib.optionalString cfg.waitForNetworkMount ''
        # Touching the path triggers the automounter.
        for _ in $(seq 1 120); do
          /bin/ls "$media" >/dev/null 2>&1
          /sbin/mount | grep -q " on $media (nfs" && break
          sleep 5
        done
        if ! /sbin/mount | grep -q " on $media (nfs"; then
          echo "immich: $media is not an NFS mount, not starting" >&2
          exit 1
        fi
      ''}
      until ${db}/bin/pg_isready -q -h ${escapeShellArg socketDir} -U ${cfg.database.user}; do
        sleep 1
      done
      if ! ${db}/bin/psql -h ${escapeShellArg socketDir} -U ${cfg.database.user} -d postgres -tAc \
        "SELECT 1 FROM pg_database WHERE datname = '${cfg.database.name}'" | grep -q 1; then
        ${db}/bin/createdb -h ${escapeShellArg socketDir} -U ${cfg.database.user} ${cfg.database.name}
      fi
      ${exports}
      exec ${getExe cfg.package}
    '';

    immichAdmin = pkgs.writeShellScriptBin "immich-admin" ''
      ${exports}
      exec ${cfg.package}/bin/immich-admin "$@"
    '';

    agent = name: args: extra: {
      serviceConfig =
        {
          Label = "${labelPrefix}.${name}";
          ProgramArguments = args;
          RunAtLoad = true;
          KeepAlive = true;
          ThrottleInterval = 10;
          ProcessType = "Background";
          StandardOutPath = "${cfg.logDir}/${name}.log";
          StandardErrorPath = "${cfg.logDir}/${name}.log";
        }
        // extra;
    };
  in {
    options.services.immich = {
      enable = mkEnableOption "Immich, the self-hosted photo and video library";
      package = mkPackageOption pkgs "immich" {};

      mediaLocation = mkOption {
        type = types.str;
        example = "/System/Volumes/Data/nas/immich";
        description = "Where Immich keeps originals, thumbnails, transcodes and backups.";
      };

      waitForNetworkMount = mkOption {
        type = types.bool;
        default = true;
        description = "Start the server only once `mediaLocation` is a mounted NFS share.";
      };

      host = mkOption {
        type = types.str;
        default = "0.0.0.0";
        description = "Address the server listens on.";
      };

      port = mkOption {
        type = types.port;
        default = 2283;
        description = "Port the server listens on.";
      };

      settings = mkOption {
        type = types.nullOr (types.attrsOf types.anything);
        default = null;
        description = ''
          Immich's system configuration (`IMMICH_CONFIG_FILE`). Null leaves it
          to the admin pages; set, the pages become read-only. It is in the
          Nix store, so it must hold no secrets.
        '';
      };

      environment = mkOption {
        type = types.attrsOf types.str;
        default = {};
        description = "Further environment for the server and `immich-admin`.";
      };

      stateDir = mkOption {
        type = types.str;
        default = "${home}/Library/Application Support/Immich";
        defaultText = lib.literalExpression ''"/Users/<user>/Library/Application Support/Immich"'';
        description = "The database cluster lives here (local disk).";
      };

      runtimeDir = mkOption {
        type = types.str;
        default = "${home}/Library/Caches/Immich/run";
        defaultText = lib.literalExpression ''"/Users/<user>/Library/Caches/Immich/run"'';
        description = "Postgres and Valkey sockets; no spaces (it ends up in a URL).";
      };

      cacheDir = mkOption {
        type = types.str;
        default = "${home}/Library/Caches/Immich";
        defaultText = lib.literalExpression ''"/Users/<user>/Library/Caches/Immich"'';
        description = "Machine-learning models and Valkey's working directory.";
      };

      logDir = mkOption {
        type = types.str;
        default = "${home}/Library/Logs/Immich";
        defaultText = lib.literalExpression ''"/Users/<user>/Library/Logs/Immich"'';
        description = "launchd logs, one per service.";
      };

      database = {
        package = mkOption {
          type = types.package;
          default = pkgs.postgresql_17.withPackages (ps: [ps.pgvector ps.vectorchord]);
          defaultText = lib.literalExpression "pkgs.postgresql_17.withPackages (ps: [ps.pgvector ps.vectorchord])";
          description = "Postgres with pgvector and VectorChord.";
        };
        name = mkOption {
          type = types.str;
          default = "immich";
          description = "Database name.";
        };
        user = mkOption {
          type = types.str;
          default = "immich";
          description = "Database superuser Immich connects as.";
        };
      };

      machineLearning = {
        enable = mkOption {
          type = types.bool;
          default = true;
          description = "Run machine learning (faces, smart search, OCR).";
        };
        port = mkOption {
          type = types.port;
          default = 3003;
          description = "Loopback port of the machine-learning service.";
        };
      };
    };

    config = mkIf cfg.enable {
      assertions = [
        {
          assertion = !(lib.hasInfix " " cfg.runtimeDir);
          message = "services.immich.runtimeDir must not contain spaces.";
        }
        {
          assertion = config.tccLauncher.enable;
          message = "services.immich needs tccLauncher.enable for the server's network-volume access.";
        }
      ];

      environment.systemPackages = [immichAdmin];

      # Before launchd starts the agents: their logs and sockets live here.
      system.activationScripts.extraActivation.text = ''
        echo "Creating Immich directories..."
        for d in ${escapeShellArg cfg.stateDir} ${escapeShellArg cfg.cacheDir} ${escapeShellArg cfg.logDir}; do
          install -d -m 0700 -o ${user.username} -g staff "$d"
        done
        install -d -m 0700 -o ${user.username} -g staff ${escapeShellArg socketDir}
      '';

      launchd.user.agents =
        {
          immich-postgres = agent "postgres" ["${postgresStart}"] {};

          immich-valkey = agent "valkey" [
            "${pkgs.valkey}/bin/valkey-server"
            "--port"
            "0"
            "--unixsocket"
            valkeySocket
            "--unixsocketperm"
            "700"
            "--save"
            ""
            "--appendonly"
            "no"
            "--dir"
            cfg.cacheDir
          ] {};

          immich-server =
            agent "server" [
              config.tccLauncher.path
              "${serverStart}"
            ] {
              # Its arguments point into the store; changing settings,
              # environment or the package restarts it.
              WorkingDirectory = cfg.cacheDir;
            };
        }
        // optionalAttrs cfg.machineLearning.enable {
          immich-ml = agent "ml" ["${getExe cfg.package.machine-learning}"] {
            EnvironmentVariables = {
              IMMICH_HOST = "127.0.0.1";
              IMMICH_PORT = toString cfg.machineLearning.port;
              MACHINE_LEARNING_CACHE_FOLDER = "${cfg.cacheDir}/ml";
              XDG_CACHE_HOME = "${cfg.cacheDir}/ml";
            };
          };
        };
    };
  };
}
