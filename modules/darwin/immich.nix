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
#
# Sign-in through the flake's Authelia (`oidc`): Immich's OAuth settings,
# with the client secret injected into its config when the server starts
# (never in the store), and the client registered with Authelia. A fresh
# Immich only lets an admin sign up first, so `immich-bootstrap` creates the
# admin for `oidc.adminEmail` with a password nobody knows; the first OIDC
# sign-in with that email links to it.
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

    # The template is in the store; the server's start renders it, secrets
    # and all, into the runtime directory, which only the user can enter.
    configTemplate = pkgs.writeText "immich-config.json" (builtins.toJSON cfg.settings);
    configFile = "${socketDir}/config.json";
    hasConfig = cfg.settings != {};

    oidcSecret = "authelia/oidc/clients/${cfg.oidc.clientId}/secret";
    oidcSecretDigest = "${oidcSecret}-digest";
    # Authelia (CEL): `admin` for members of an admin group, else `user`.
    roleExpression =
      "(" + concatStringsSep " || " (map (g: "\"${g}\" in groups") cfg.oidc.adminGroups) + ") ? \"admin\" : \"user\"";

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
      // optionalAttrs hasConfig {IMMICH_CONFIG_FILE = configFile;}
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
      ${lib.optionalString hasConfig ''
        umask 077
        rendered="$(mktemp ${escapeShellArg "${configFile}.XXXXXX"})"
        cat ${configTemplate} > "$rendered"
        ${concatStringsSep "\n" (mapAttrsToList (name: file: ''
            ${getExe pkgs.replace-secret} ${escapeShellArg "@${name}@"} ${escapeShellArg file} "$rendered" \
              || { echo "immich: cannot read secret ${file}" >&2; rm -f "$rendered"; exit 1; }
          '')
          cfg.secretFiles)}
        mv -f "$rendered" ${escapeShellArg configFile}
      ''}
      ${exports}
      exec ${getExe cfg.package}
    '';

    # Creates the admin a fresh Immich insists on, once, then exits.
    bootstrap = pkgs.writeShellScript "immich-bootstrap" ''
      set -u
      api=http://127.0.0.1:${toString cfg.port}/api
      for _ in $(seq 1 120); do
        /usr/bin/curl -sf "$api/server/ping" >/dev/null && break
        sleep 5
      done
      state="$(/usr/bin/curl -sf "$api/server/config")" || { echo "immich-bootstrap: server not answering" >&2; exit 1; }
      case "$state" in
        *'"isInitialized":true'*) echo "immich-bootstrap: already initialised"; exit 0 ;;
      esac
      password="$(/usr/bin/openssl rand -base64 48)"
      body="$(${getExe pkgs.jq} -n --arg email ${escapeShellArg cfg.oidc.adminEmail} \
        --arg name ${escapeShellArg cfg.oidc.adminName} --arg password "$password" \
        '{email: $email, name: $name, password: $password}')"
      unset password
      if printf '%s' "$body" | /usr/bin/curl -sf -X POST -H 'Content-Type: application/json' \
        --data-binary @- "$api/auth/admin-sign-up" >/dev/null; then
        echo "immich-bootstrap: created the admin ${cfg.oidc.adminEmail}"
      else
        echo "immich-bootstrap: admin sign-up failed" >&2
        exit 1
      fi
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
        type = types.attrsOf types.anything;
        default = {};
        example = {passwordLogin.enabled = false;};
        description = ''
          Immich's system configuration (`IMMICH_CONFIG_FILE`), merged over
          Immich's defaults. Empty leaves it to the admin pages; set, those
          pages become read-only. Secrets go in as `@name@` placeholders
          filled from `secretFiles`; the rest is in the Nix store.
        '';
      };

      secretFiles = mkOption {
        type = types.attrsOf types.str;
        default = {};
        example = lib.literalExpression ''{oidcClientSecret = config.sops.secrets."immich/oidc".path;}'';
        description = ''
          Files whose first line replaces `@<name>@` in `settings` when the
          server starts. The user must be able to read them; changing one
          takes a server restart.
        '';
      };

      oidc = {
        enable = mkEnableOption "sign-in through OpenID Connect only (the flake's Authelia by default)";
        publicUrl = mkOption {
          type = types.str;
          example = "https://photos.example.com";
          description = "Immich's public origin; redirect URIs and the external domain derive from it.";
        };
        issuer = mkOption {
          type = types.str;
          default = config.oidcIssuer;
          defaultText = lib.literalExpression "config.oidcIssuer";
          description = "OIDC issuer; the flake's Authelia registers the client when it is the default.";
        };
        clientId = mkOption {
          type = types.str;
          default = "immich";
          description = ''
            Client ID. The secret is `authelia/oidc/clients/<id>/secret` in this
            host's nix-secrets file, its digest `…/secret-digest` in the
            Authelia host's.
          '';
        };
        groups = mkOption {
          type = types.listOf types.str;
          default = [];
          example = ["Admin" "User"];
          description = "LLDAP groups whose members may sign in; empty lets every user in.";
        };
        adminGroups = mkOption {
          type = types.nonEmptyListOf types.str;
          default = ["Admin"];
          description = "Members become Immich admins (the `immich_role` claim); others plain users.";
        };
        buttonText = mkOption {
          type = types.str;
          default = "Sign in with Authelia";
          description = "Label of the sign-in button.";
        };
        adminEmail = mkOption {
          type = types.str;
          default = user.email;
          defaultText = lib.literalExpression "user.email";
          description = "Email of the admin created on a fresh install; the matching OIDC user links to it.";
        };
        adminName = mkOption {
          type = types.str;
          default = user.name;
          defaultText = lib.literalExpression "user.name";
          description = "Display name of that admin.";
        };
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
        environment = mkOption {
          type = types.attrsOf types.str;
          default = {};
          example = {MACHINE_LEARNING_REQUEST_THREADS = "4";};
          description = ''
            Extra environment for the machine-learning service: its
            `MACHINE_LEARNING_*` settings (model TTL, threads, memory arena).
          '';
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

      services.immich = mkIf cfg.oidc.enable {
        secretFiles.oidcClientSecret = config.sops.secrets.${oidcSecret}.path;
        settings = {
          passwordLogin.enabled = false;
          server.externalDomain = cfg.oidc.publicUrl;
          oauth = {
            enabled = true;
            autoLaunch = true;
            autoRegister = true;
            inherit (cfg.oidc) buttonText clientId;
            clientSecret = "@oidcClientSecret@";
            issuerUrl = cfg.oidc.issuer;
            # `immich` is the scope that carries the client's own claims.
            scope = "openid email profile ${cfg.oidc.clientId}";
            roleClaim = "immich_role";
            tokenEndpointAuthMethod = "client_secret_post";
            mobileOverrideEnabled = true;
            mobileRedirectUri = "${cfg.oidc.publicUrl}/api/oauth/mobile-redirect";
          };
        };
      };

      sops.secrets = mkIf cfg.oidc.enable {
        ${oidcSecret}.owner = user.username;
      };

      # Confidential client; Immich posts its secret in the body, uses PKCE,
      # and reads the user from userinfo. The mobile app comes back through
      # the server's mobile-redirect, which hands over to app.immich://.
      oidcClients = mkIf (cfg.oidc.enable && cfg.oidc.issuer == config.oidcIssuer) {
        ${cfg.oidc.clientId} = {
          name = "Immich";
          secretDigest = oidcSecretDigest;
          redirectUris = [
            "${cfg.oidc.publicUrl}/auth/login"
            "${cfg.oidc.publicUrl}/user-settings"
            "${cfg.oidc.publicUrl}/api/oauth/mobile-redirect"
          ];
          inherit (cfg.oidc) groups;
          customClaims.immich_role.expression = roleExpression;
          settings.token_endpoint_auth_method = "client_secret_post";
        };
      };

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
        // optionalAttrs cfg.oidc.enable {
          immich-bootstrap = agent "bootstrap" ["${bootstrap}"] {
            # Retries until it has created the admin or found one.
            KeepAlive.SuccessfulExit = false;
            ThrottleInterval = 30;
          };
        }
        // optionalAttrs cfg.machineLearning.enable {
          immich-ml = agent "ml" ["${getExe cfg.package.machine-learning}"] {
            EnvironmentVariables =
              {
                IMMICH_HOST = "127.0.0.1";
                IMMICH_PORT = toString cfg.machineLearning.port;
                MACHINE_LEARNING_CACHE_FOLDER = "${cfg.cacheDir}/ml";
                XDG_CACHE_HOME = "${cfg.cacheDir}/ml";
              }
              // cfg.machineLearning.environment;
          };
        };
    };
  };
}
