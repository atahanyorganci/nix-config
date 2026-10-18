{config, ...}: let
  infra = config.flake.infra;
in {
  flake.modules.nixos.authelia = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.authelia;
    instance = config.services.authelia.instances.main;
    unit = "authelia-main";
    url = "https://${cfg.key}.${infra.domain}";
    secret = name: config.sops.secrets.${name}.path;
    placeholder = name: config.sops.placeholder.${name};
    # Authelia refuses an OpenID Connect provider without clients, so the
    # provider (and its signing key and HMAC secret) is on while there is one.
    oidc = cfg.oidc.clients != {};
    # Values written to nix-secrets once (see `enable`), never by a stack.
    generated =
      ["authelia/jwt-secret" "authelia/session-secret" "authelia/storage-encryption-key"]
      ++ lib.optionals oidc ["authelia/oidc/hmac-secret" "authelia/oidc/issuer-private-key"];
    # HomeInfra's `postgres.roles.authelia`, written by `just store-secret`.
    postgres = ["authelia/postgres/host" "authelia/postgres/username" "authelia/postgres/password"];
  in {
    options.authelia = {
      enable = lib.mkEnableOption ''
        Authelia, the login portal and OpenID Connect provider, keeping its
        state (second factors, consents, tokens, bans) in the infra Postgres
        cluster (HomeInfra's `postgres.roles.authelia`) and its sessions in a
        local Redis. Users and groups are LLDAP's, on the same host. It needs
        `authelia/postgres/{host,username,password}` and
        `authelia/{jwt-secret,session-secret,storage-encryption-key}` in the
        host's nix-secrets file before it is enabled, and
        `authelia/oidc/{hmac-secret,issuer-private-key}` once it has a client:
        sops-nix fails activation on a missing key. The storage encryption key
        encrypts second factors in Postgres; replacing it, rather than changing
        it with `authelia storage encryption change-key`, loses them
      '';

      key = lib.mkOption {
        type = lib.types.str;
        default = "auth";
        description = "Subdomain of `infra.domain` NetBird's reverse proxy serves it on.";
      };

      port = lib.mkOption {
        type = lib.types.port;
        default = 9091;
        description = "Port on which Authelia listens.";
      };

      interface = lib.mkOption {
        type = lib.types.str;
        default = "nb-wt0";
        description = "Mesh interface on which the port is reachable, for the reverse proxy.";
      };

      oidc.clients = lib.mkOption {
        type = lib.types.attrsOf (pkgs.formats.yaml {}).type;
        default = {};
        example = lib.literalExpression ''
          {
            netbird = {
              client_name = "NetBird";
              # `authelia crypto hash generate pbkdf2 --variant sha512 --random`
              client_secret = "$pbkdf2-sha512$310000$…";
              authorization_policy = "two_factor";
              redirect_uris = ["https://netbird.example.com/oauth2/callback/…"];
              scopes = ["openid" "profile" "email" "groups"];
            };
          }
        '';
        description = ''
          OpenID Connect clients by client ID, each in Authelia's own schema
          (`identity_providers.oidc.clients`, without `client_id`). Secrets are
          digests, which may sit in the store; the plaintext belongs to the
          client. No clients, no provider.
        '';
      };
    };

    config = lib.mkIf cfg.enable {
      assertions = [
        {
          assertion = config.lldap.enable;
          message = "authelia: users and groups come from LLDAP on the same host; enable `lldap` too.";
        }
      ];

      # Sessions survive Authelia restarts and deploys. Socket only, run as
      # Authelia's user so the socket is its own.
      services.redis.servers.authelia = {
        enable = true;
        inherit (instance) user;
      };

      services.authelia.instances.main = {
        enable = true;
        # Loaded as systemd credentials by the nixpkgs module, which PID 1
        # copies from the root-only secrets.
        secrets =
          {
            jwtSecretFile = secret "authelia/jwt-secret";
            sessionSecretFile = secret "authelia/session-secret";
            storageEncryptionKeyFile = secret "authelia/storage-encryption-key";
          }
          // lib.optionalAttrs oidc {
            oidcHmacSecretFile = secret "authelia/oidc/hmac-secret";
            oidcIssuerPrivateKeyFile = secret "authelia/oidc/issuer-private-key";
          };
        # The other two secrets, as credentials loaded below.
        environmentVariables = {
          AUTHELIA_AUTHENTICATION_BACKEND_LDAP_PASSWORD_FILE = "%d/ldap-password";
          AUTHELIA_STORAGE_POSTGRES_PASSWORD_FILE = "%d/postgres-password";
        };
        settings =
          {
            theme = "auto";
            log = {
              level = "info";
              format = "text";
            };
            # The reverse proxy dials the host's mesh address; the firewall
            # keeps the port off every other interface.
            server.address = "tcp://0.0.0.0:${toString cfg.port}/";
            authentication_backend.ldap = {
              implementation = "lldap";
              address = "ldap://127.0.0.1:${toString config.lldap.ldapPort}";
              base_dn = config.lldap.baseDn;
              # LLDAP's admin: password resets and changes need a user that may
              # set passwords, and its password is pinned from nix-secrets.
              user = "uid=admin,ou=people,${config.lldap.baseDn}";
            };
            # Only forward-auth consults access control, and nothing uses it:
            # apps log in over OpenID Connect. Authelia wants a policy anyway.
            access_control.default_policy = "two_factor";
            session = {
              # Scoped to Authelia's own host, which OpenID Connect is enough
              # for, so no backend under infra.domain ever receives it.
              cookies = [
                {
                  domain = "${cfg.key}.${infra.domain}";
                  authelia_url = url;
                }
              ];
              redis.host = config.services.redis.servers.authelia.unixSocket;
            };
            # Address, username and TLS server name come from authelia.env.
            storage.postgres.database = "authelia";
            # Until there is SMTP: one-time codes and reset links land here.
            notifier.filesystem.filename = "/var/lib/${unit}/notifications.txt";
            totp.issuer = infra.domain;
            webauthn = {
              display_name = infra.domain;
              enable_passkey_login = true;
            };
          }
          // lib.optionalAttrs oidc {
            identity_providers.oidc.clients = lib.mapAttrsToList (id: client: {client_id = id;} // client) cfg.oidc.clients;
          };
      };

      systemd.services.${unit} = {
        # LLDAP may still be migrating when Authelia starts; Authelia restarts
        # until it answers. Sessions cannot do without Redis.
        wants = ["lldap.service"];
        requires = ["redis-authelia.service"];
        after = ["lldap.service" "redis-authelia.service"];
        serviceConfig = {
          # Read by PID 1 before it drops to the service user, so it stays
          # root's alone.
          EnvironmentFile = config.sops.templates."authelia.env".path;
          LoadCredential = [
            "ldap-password:${secret "lldap/admin-password"}"
            "postgres-password:${secret "authelia/postgres/password"}"
          ];
        };
      };

      sops.secrets =
        lib.genAttrs (generated ++ postgres) (_: {
          restartUnits = ["${unit}.service"];
        })
        // {
          # Declared by the lldap module; Authelia binds with it too.
          "lldap/admin-password".restartUnits = ["${unit}.service"];
        };

      # Settings Authelia takes from the environment: PlanetScale's host and the
      # role's username, which only the stack knows. TLS is verified against
      # the system CA store.
      sops.templates."authelia.env" = {
        content = ''
          AUTHELIA_STORAGE_POSTGRES_ADDRESS=tcp://${placeholder "authelia/postgres/host"}:5432
          AUTHELIA_STORAGE_POSTGRES_USERNAME=${placeholder "authelia/postgres/username"}
          AUTHELIA_STORAGE_POSTGRES_TLS_SERVER_NAME=${placeholder "authelia/postgres/host"}
        '';
        restartUnits = ["${unit}.service"];
      };

      # Public: the login page has to be reachable before a device is on the
      # mesh, and Authelia does its own authentication.
      httpServices.${cfg.key} = {
        inherit (cfg) port;
        expose = {
          enable = true;
          private = false;
        };
        auth.type = "none";
      };

      networking.firewall.interfaces.${cfg.interface}.allowedTCPPorts = [cfg.port];
    };
  };
}
