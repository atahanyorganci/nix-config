{config, ...}: let
  infra = config.flake.infra;
in {
  flake.modules.nixos.lldap = {
    lib,
    config,
    ...
  }: let
    cfg = config.lldap;
    secret = name: config.sops.secrets.${name}.path;
    placeholder = name: config.sops.placeholder.${name};
    # Values written to nix-secrets once (see `enable`), never by a stack.
    generated = ["lldap/jwt-secret" "lldap/key-seed" "lldap/admin-password"];
    # HomeInfra's `postgres.roles.lldap`, written by `just store-secret`.
    postgres = ["lldap/postgres/host" "lldap/postgres/username" "lldap/postgres/password"];
  in {
    options.lldap = {
      enable = lib.mkEnableOption ''
        LLDAP, the directory of users and groups Authelia authenticates
        against, keeping it in the infra Postgres cluster (HomeInfra's
        `postgres.roles.lldap`). It needs `lldap/postgres/{host,username,password}`
        and `lldap/{jwt-secret,key-seed,admin-password}` in the host's
        nix-secrets file before it is enabled: sops-nix fails activation on a
        missing key. The key seed derives the server key every password is
        bound to, so replacing it invalidates them all
      '';

      key = lib.mkOption {
        type = lib.types.str;
        default = "ldap";
        description = "Subdomain of `infra.domain` NetBird's reverse proxy serves the admin UI on.";
      };

      httpPort = lib.mkOption {
        type = lib.types.port;
        default = 17170;
        description = "Port of the web UI and its API.";
      };

      ldapPort = lib.mkOption {
        type = lib.types.port;
        default = 3890;
        description = "Port of the LDAP server, on loopback only.";
      };

      baseDn = lib.mkOption {
        type = lib.types.str;
        default = lib.concatMapStringsSep "," (part: "dc=${part}") (lib.splitString "." infra.domain);
        defaultText = lib.literalExpression ''"dc=…" for each label of infra.domain'';
        description = "Base DN of the directory; users are under `ou=people`, groups under `ou=groups`.";
      };

      interface = lib.mkOption {
        type = lib.types.str;
        default = "nb-wt0";
        description = "Mesh interface on which the web UI is reachable, for the reverse proxy.";
      };

      accessGroups = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = ["Admin"];
        description = "NetBird groups allowed to reach the admin UI.";
      };
    };

    config = lib.mkIf cfg.enable {
      services.lldap = {
        enable = true;
        # Postgres is PlanetScale's, reached with the URL from lldap.env.
        database.createLocally = false;
        settings = {
          # Authelia binds on the same host; nothing else speaks LDAP to it.
          ldap_host = "127.0.0.1";
          ldap_port = cfg.ldapPort;
          # The reverse proxy dials the host's mesh address; the firewall keeps
          # the port off every other interface.
          http_host = "0.0.0.0";
          http_port = cfg.httpPort;
          http_url = "https://${cfg.key}.${infra.domain}";
          ldap_base_dn = cfg.baseDn;
          ldap_user_dn = "admin";
          ldap_user_email = "admin@${infra.domain}";
          # The admin password is the one in nix-secrets, restored on every
          # start: Authelia binds with it, so it must not drift.
          force_ldap_user_pass_reset = "always";
          # The server key comes from the key seed, not a file in the state
          # directory; an empty path silences LLDAP's warning about ignoring it.
          key_file = "";
        };
        # LLDAP reads `<option>_FILE` for any option. The unit runs as a
        # dynamic user, so the files are systemd credentials (%d), which PID 1
        # copies from the root-only secrets.
        environment = {
          LLDAP_JWT_SECRET_FILE = "%d/jwt-secret";
          LLDAP_KEY_SEED_FILE = "%d/key-seed";
          LLDAP_LDAP_USER_PASS_FILE = "%d/admin-password";
        };
        # Read by PID 1 for EnvironmentFile before it drops to the service
        # user, so it stays root's alone.
        environmentFile = config.sops.templates."lldap.env".path;
      };

      systemd.services.lldap.serviceConfig.LoadCredential = [
        "jwt-secret:${secret "lldap/jwt-secret"}"
        "key-seed:${secret "lldap/key-seed"}"
        "admin-password:${secret "lldap/admin-password"}"
      ];

      sops.secrets = lib.genAttrs (generated ++ postgres) (_: {
        restartUnits = ["lldap.service"];
      });

      # sqlx, not libpq: it reads `sslrootcert` as a file path, and verifies
      # `verify-full` against its bundled Mozilla roots without one.
      sops.templates."lldap.env" = {
        content = ''
          LLDAP_DATABASE_URL=postgres://${placeholder "lldap/postgres/username"}:${placeholder "lldap/postgres/password"}@${placeholder "lldap/postgres/host"}:5432/lldap?sslmode=verify-full
        '';
        restartUnits = ["lldap.service"];
      };

      # Private like every admin console on the proxy: only Admin peers reach
      # it, and LLDAP's own login decides the rest.
      httpServices.${cfg.key} = {
        port = cfg.httpPort;
        expose = {
          enable = true;
          private = true;
          inherit (cfg) accessGroups;
        };
        auth.type = "none";
      };

      networking.firewall.interfaces.${cfg.interface}.allowedTCPPorts = [cfg.httpPort];
    };
  };
}
