{config, ...}: let
  infra = config.flake.infra;
in {
  flake.modules.nixos.vaultwarden = {
    lib,
    config,
    ...
  }: let
    cfg = config.vaultwarden;
    # Authelia's client for Vaultwarden. Both live on this host, so its
    # nix-secrets file holds the secret twice: the plaintext for Vaultwarden,
    # and its digest for Authelia.
    ssoClientId = "vaultwarden";
    ssoSecret = "authelia/oidc/clients/${ssoClientId}/secret";
    ssoSecretDigest = "${ssoSecret}-digest";
  in {
    options.vaultwarden = {
      enable = lib.mkEnableOption ''
        a Vaultwarden server keeping its vault in the infra Postgres cluster
        (HomeInfra's `postgres.roles.vaultwarden`). It needs
        `vaultwarden/database-url` in the host's nix-secrets file (`just
        store-secret <host> vaultwarden/database-url=postgres/roles/vaultwarden/url`)
        before it is enabled: sops-nix fails activation on a missing key
      '';

      key = lib.mkOption {
        type = lib.types.str;
        default = "vault";
        description = "Subdomain of `infra.domain` NetBird's reverse proxy serves it on.";
      };

      port = lib.mkOption {
        type = lib.types.port;
        default = 8222;
        description = "Port on which Vaultwarden listens.";
      };

      interface = lib.mkOption {
        type = lib.types.str;
        default = "nb-wt0";
        description = "Mesh interface on which the port is reachable, for the reverse proxy.";
      };

      openRegistration = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = ''
          Let anyone who reaches the service create an account with email and
          master password. Off, accounts come only from invitations, or with
          `sso` only from single sign-on.
        '';
      };

      accessGroups = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = ["Admin" "Users"];
        description = "NetBird groups allowed to reach the service.";
      };

      attachments = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = ''
          Let users attach files to items. Attachments are files in
          /var/lib/vaultwarden, not rows in Postgres, so they share the host
          disk's fate. Off, uploads are refused (a limit of 0 KB per user and
          per organization).
        '';
      };

      sso = {
        enable = lib.mkEnableOption ''
          logging in through Authelia, on this host, over OpenID Connect. SSO
          replaces the email step only: the master password still decrypts the
          vault. A first SSO login creates an account, or joins the existing one
          with the same (verified) email. It needs the client secret in the
          host's nix-secrets file as `authelia/oidc/clients/vaultwarden/secret`
          (plaintext, for Vaultwarden) and `…/secret-digest` (its PBKDF2
          digest, for Authelia)
        '';

        only = lib.mkOption {
          type = lib.types.bool;
          default = false;
          description = ''
            Refuse email and master password logins, so every login goes
            through Authelia (SSO_ONLY). Turn on once every account has logged
            in with SSO once, which links it.
          '';
        };
      };
    };

    config = lib.mkIf cfg.enable (lib.mkMerge [
      (lib.mkIf cfg.sso.enable {
        assertions = [
          {
            assertion = config.authelia.enable;
            message = "vaultwarden.sso: Authelia must run on this host too; enable `authelia`.";
          }
        ];

        services.vaultwarden.config = {
          SSO_ENABLED = true;
          SSO_ONLY = cfg.sso.only;
          SSO_AUTHORITY = config.authelia.url;
          SSO_CLIENT_ID = ssoClientId;
          SSO_SCOPES = "email profile";
          SSO_PKCE = true;
          # Only LLDAP's users reach Authelia, and only NetBird's groups reach
          # the vault, so a first SSO login may create an account.
          SSO_SIGNUPS_ALLOWED = true;
          # The way in for an address without an account would otherwise be an
          # invitation (organization or emergency access), registered with
          # email and master password. Off, accounts come from SSO alone,
          # existing ones can still be invited, and the web vault drops
          # "Create account".
          INVITATIONS_ALLOWED = false;
          SSO_SIGNUPS_MATCH_EMAIL = true;
          # SSO for the login, Vaultwarden's own sessions after it (2 h access,
          # 7 days idle refresh): Authelia's refresh tokens last 90 minutes,
          # which would sign the apps out every time they sit idle that long.
          SSO_AUTH_ONLY_NOT_SESSION = true;
        };

        authelia.oidc.clients.${ssoClientId} = {
          client_name = "Vaultwarden";
          secretFile = config.sops.secrets.${ssoSecretDigest}.path;
          public = false;
          authorization_policy = "two_factor";
          # Choosing single sign-on on Vaultwarden's login page is the consent.
          consent_mode = "implicit";
          require_pkce = true;
          pkce_challenge_method = "S256";
          # Vaultwarden derives it from DOMAIN.
          redirect_uris = ["https://${config.services.vaultwarden.domain}/identity/connect/oidc-signin"];
          scopes = ["openid" "profile" "email"];
          response_types = ["code"];
          # Sessions are Vaultwarden's own, so no refresh tokens.
          grant_types = ["authorization_code"];
          # Vaultwarden reads email and name from userinfo, so the default,
          # minimal ID token is enough; an opaque access token comes with
          # `expires_in`, which Vaultwarden falls back to.
          access_token_signed_response_alg = "none";
          userinfo_signed_response_alg = "none";
          token_endpoint_auth_method = "client_secret_basic";
        };

        sops.secrets = {
          ${ssoSecret}.restartUnits = ["vaultwarden.service"];
          ${ssoSecretDigest}.restartUnits = ["authelia-main.service"];
        };
      })
      {
        services.vaultwarden = {
          enable = true;
          dbBackend = "postgresql";
          # The web vault and WebAuthn need the public HTTPS origin, which the
          # reverse proxy terminates.
          domain = "${cfg.key}.${infra.domain}";
          config = {
            # The reverse proxy dials the host's mesh address; the firewall keeps
            # the port off every other interface.
            ROCKET_ADDRESS = "0.0.0.0";
            ROCKET_PORT = cfg.port;
            SIGNUPS_ALLOWED = cfg.openRegistration;
            # Null leaves Vaultwarden's own default: no limit.
            USER_ATTACHMENT_LIMIT =
              if cfg.attachments
              then null
              else 0;
            ORG_ATTACHMENT_LIMIT =
              if cfg.attachments
              then null
              else 0;
          };
          # Read by PID 1 for EnvironmentFile before it drops to the service user,
          # so it stays root's alone.
          environmentFile = config.sops.templates."vaultwarden.env".path;
        };

        # A role's direct URL to its own database, verifying TLS against the
        # system CA store (`sslrootcert=system`, libpq 16 and later). Vaultwarden
        # migrates the schema itself on start.
        sops.secrets."vaultwarden/database-url" = {};
        sops.templates."vaultwarden.env" = {
          content =
            ''
              DATABASE_URL=${config.sops.placeholder."vaultwarden/database-url"}
            ''
            + lib.optionalString cfg.sso.enable ''
              SSO_CLIENT_SECRET=${config.sops.placeholder.${ssoSecret}}
            '';
          restartUnits = ["vaultwarden.service"];
        };

        # Private like every service on the proxy: NetBird's identity layer
        # decides who reaches the login page, Vaultwarden's accounts the rest.
        httpServices.${cfg.key} = {
          inherit (cfg) port;
          expose = {
            enable = true;
            private = true;
            inherit (cfg) accessGroups;
          };
          auth.type = "none";
        };

        networking.firewall.interfaces.${cfg.interface}.allowedTCPPorts = [cfg.port];
      }
    ]);
  };
}
