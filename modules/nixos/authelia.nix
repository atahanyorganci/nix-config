{config, ...}: let
  infra = config.flake.infra;
  # Every host, this one included: each declares the clients its services
  # need (`oidcClients`), and Authelia registers them all.
  allSystems = config.flake.nixosConfigurations // config.flake.darwinConfigurations;
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
    inherit (cfg) url;
    secret = name: config.sops.secrets.${name}.path;
    placeholder = name: config.sops.placeholder.${name};
    # Authelia refuses an OpenID Connect provider without clients, so the
    # provider (and its signing key and HMAC secret) is on while there is one.
    oidc = cfg.oidc.clients != {};
    # Clients whose secret digest is read from a file when Authelia starts.
    secretFileClients = lib.filterAttrs (_: client: client.secretFile != null) cfg.oidc.clients;
    credentialName = id: "oidc-client-${id}";

    # Every host's `oidcClients`, merged; the list keeps duplicates for the
    # uniqueness check.
    declaredByHost = lib.mapAttrs (_: system: system.config.oidcClients) allSystems;
    declared = lib.foldl' lib.mergeAttrs {} (lib.attrValues declaredByHost);
    declaredIds = lib.concatMap lib.attrNames (lib.attrValues declaredByHost);
    # A client's own claims and authorization policies are named after it.
    policyName = id: "client-${id}";
    toClient = id: client:
      {
        client_name = client.name;
        inherit (client) public scopes;
        authorization_policy =
          if client.groups == []
          then "two_factor"
          else policyName id;
        # Choosing to sign in through Authelia on the service is the consent.
        consent_mode = "implicit";
        redirect_uris = client.redirectUris;
        response_types = ["code"];
        grant_types = ["authorization_code"];
        token_endpoint_auth_method =
          if client.public
          then "none"
          else "client_secret_basic";
        access_token_signed_response_alg = "none";
        userinfo_signed_response_alg = "none";
      }
      // lib.optionalAttrs client.pkce {
        require_pkce = true;
        pkce_challenge_method = "S256";
      }
      // lib.optionalAttrs (client.idTokenClaims != []) {
        claims_policy = policyName id;
      }
      // lib.optionalAttrs (client.secretDigest != null) {
        secretFile = secret client.secretDigest;
      }
      // client.settings;
    digestSecrets = lib.unique (lib.filter (key: key != null) (lib.mapAttrsToList (_: client: client.secretDigest) declared));
    clientSettings = id: client:
      {client_id = id;}
      // lib.removeAttrs client ["secretFile"]
      // lib.optionalAttrs (client.secretFile != null) {
        # A template the provider's `template` filter (on whenever there are
        # clients) fills from the systemd credential. Backquoted strings need
        # no escaping in YAML, however the generator quotes the value.
        client_secret = "{{ mustEnv `CREDENTIALS_DIRECTORY` | printf `%s/${credentialName id}` | secret }}";
      };
    # Values written to nix-secrets once (see `enable`), never by a stack.
    generated =
      ["authelia/jwt-secret" "authelia/session-secret" "authelia/storage-encryption-key"]
      ++ lib.optionals oidc ["authelia/oidc/hmac-secret" "authelia/oidc/issuer-private-key"];
    # HomeInfra's `postgres.roles.authelia`, written by `just store-secret`.
    postgres = ["authelia/postgres/host" "authelia/postgres/username" "authelia/postgres/password"];
    # NetbirdServer's `smtp`, shared by every service on the host that mails.
    smtp = ["smtp/host" "smtp/username" "smtp/password"];
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

      url = lib.mkOption {
        type = lib.types.str;
        readOnly = true;
        default = "https://${cfg.key}.${infra.domain}";
        defaultText = lib.literalExpression ''"https://''${config.authelia.key}.''${infra.domain}"'';
        description = "Public URL of the portal, which is also the OpenID Connect issuer.";
      };

      smtp.enable = lib.mkEnableOption ''
        mailing one-time codes and password reset links through the SMTP relay
        (NetbirdServer's `smtp`), from `infra.mailDomain`. Off, they land in a
        file in the state directory. It needs `smtp/{host,username,password}`
        in the host's nix-secrets file (`just store-secret <host> --stack
        NetbirdServer smtp/host smtp/username smtp/password`)
      '';

      oidc.clients = lib.mkOption {
        type = lib.types.attrsOf (lib.types.submodule {
          freeformType = (pkgs.formats.yaml {}).type;
          options.secretFile = lib.mkOption {
            type = lib.types.nullOr lib.types.str;
            default = null;
            example = "/run/secrets/authelia/oidc/clients/example/secret-digest";
            description = ''
              File holding the client secret's digest, in place of
              `client_secret`. Authelia reads it as a systemd credential when it
              starts, so the digest stays out of the store with the plaintext.
            '';
          };
        });
        default = {};
        example = lib.literalExpression ''
          {
            example = {
              client_name = "Example";
              # The digest of `authelia crypto hash generate pbkdf2 --variant sha512 --random`.
              secretFile = config.sops.secrets."authelia/oidc/clients/example/secret-digest".path;
              authorization_policy = "two_factor";
              redirect_uris = ["https://example.com/oauth2/callback"];
              scopes = ["openid" "profile" "email"];
            };
          }
        '';
        description = ''
          OpenID Connect clients by client ID, each in Authelia's own schema
          (`identity_providers.oidc.clients`, without `client_id`), plus
          `secretFile`. A secret is a digest; the plaintext belongs to the
          client. No clients, no provider. Every host's `oidcClients` end up
          here; set this directly only for what they cannot express.
        '';
      };

      oidc.authorizationPolicies = lib.mkOption {
        type = lib.types.attrsOf (pkgs.formats.yaml {}).type;
        default = {};
        example = {
          admins = {
            default_policy = "deny";
            rules = [
              {
                policy = "two_factor";
                subject = ["group:admin"];
              }
            ];
          };
        };
        description = ''
          Authorization policies by name
          (`identity_providers.oidc.authorization_policies`), which a client
          selects with `authorization_policy` to let in only some users.
        '';
      };

      oidc.claimsPolicies = lib.mkOption {
        type = lib.types.attrsOf (pkgs.formats.yaml {}).type;
        default = {};
        example = {
          id-token-profile.id_token = ["email" "email_verified" "name" "preferred_username"];
        };
        description = ''
          Claims policies by name (`identity_providers.oidc.claims_policies`),
          which a client selects with `claims_policy`. Since 4.39 ID tokens
          carry only the standard claims; a client that reads profile or email
          claims from the ID token, not userinfo, needs a policy adding them.
        '';
      };
    };

    config = lib.mkIf cfg.enable {
      assertions =
        [
          {
            assertion = config.lldap.enable;
            message = "authelia: users and groups come from LLDAP on the same host; enable `lldap` too.";
          }
          {
            assertion = lib.length declaredIds == lib.length (lib.unique declaredIds);
            message = "authelia: an OpenID Connect client ID is declared on more than one host (`oidcClients`).";
          }
        ]
        ++ lib.mapAttrsToList (id: client: {
          assertion =
            if client.public
            then client.secretDigest == null && client.pkce
            else client.secretDigest != null;
          message = "authelia: client `${id}` must be public with PKCE and no secret, or confidential with `secretDigest`.";
        })
        declared;

      authelia.oidc = {
        clients = lib.mapAttrs toClient declared;
        claimsPolicies = lib.mapAttrs' (id: client: lib.nameValuePair (policyName id) {id_token = client.idTokenClaims;}) (
          lib.filterAttrs (_: client: client.idTokenClaims != []) declared
        );
        authorizationPolicies = lib.mapAttrs' (id: client:
          lib.nameValuePair (policyName id) {
            default_policy = "deny";
            rules = [
              {
                policy = "two_factor";
                subject = map (group: "group:${group}") client.groups;
              }
            ];
          }) (lib.filterAttrs (_: client: client.groups != []) declared);
      };

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
        environmentVariables =
          {
            AUTHELIA_AUTHENTICATION_BACKEND_LDAP_PASSWORD_FILE = "%d/ldap-password";
            AUTHELIA_STORAGE_POSTGRES_PASSWORD_FILE = "%d/postgres-password";
          }
          // lib.optionalAttrs cfg.smtp.enable {
            AUTHELIA_NOTIFIER_SMTP_PASSWORD_FILE = "%d/smtp-password";
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
            # One-time codes and reset links, by email or into a file. The
            # relay's address and username come from authelia.env.
            notifier =
              if cfg.smtp.enable
              then {smtp.sender = "Authelia <auth@${infra.mailDomain}>";}
              else {filesystem.filename = "/var/lib/${unit}/notifications.txt";};
            totp.issuer = infra.domain;
            webauthn = {
              display_name = infra.domain;
              enable_passkey_login = true;
            };
          }
          // lib.optionalAttrs oidc {
            identity_providers.oidc =
              {
                clients = lib.mapAttrsToList clientSettings cfg.oidc.clients;
              }
              // lib.optionalAttrs (cfg.oidc.claimsPolicies != {}) {
                claims_policies = cfg.oidc.claimsPolicies;
              }
              // lib.optionalAttrs (cfg.oidc.authorizationPolicies != {}) {
                authorization_policies = cfg.oidc.authorizationPolicies;
              };
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
          LoadCredential =
            [
              "ldap-password:${secret "lldap/admin-password"}"
              "postgres-password:${secret "authelia/postgres/password"}"
            ]
            ++ lib.optional cfg.smtp.enable "smtp-password:${secret "smtp/password"}"
            ++ lib.mapAttrsToList (id: client: "${credentialName id}:${client.secretFile}") secretFileClients;
        };
      };

      sops.secrets =
        lib.genAttrs (generated ++ postgres ++ digestSecrets ++ lib.optionals cfg.smtp.enable smtp) (_: {
          restartUnits = ["${unit}.service"];
        })
        // {
          # Declared by the lldap module; Authelia binds with it too.
          "lldap/admin-password".restartUnits = ["${unit}.service"];
        };

      # Settings Authelia takes from the environment: PlanetScale's host and the
      # role's username, and the relay's host and username, which only the
      # stacks know. TLS is verified against the system CA store; the relay
      # takes STARTTLS on the submission port.
      sops.templates."authelia.env" = {
        content =
          ''
            AUTHELIA_STORAGE_POSTGRES_ADDRESS=tcp://${placeholder "authelia/postgres/host"}:5432
            AUTHELIA_STORAGE_POSTGRES_USERNAME=${placeholder "authelia/postgres/username"}
            AUTHELIA_STORAGE_POSTGRES_TLS_SERVER_NAME=${placeholder "authelia/postgres/host"}
          ''
          + lib.optionalString cfg.smtp.enable ''
            AUTHELIA_NOTIFIER_SMTP_ADDRESS=submission://${placeholder "smtp/host"}:587
            AUTHELIA_NOTIFIER_SMTP_USERNAME=${placeholder "smtp/username"}
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
