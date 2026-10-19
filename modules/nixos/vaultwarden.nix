{config, ...}: let
  infra = config.flake.infra;
in {
  flake.modules.nixos.vaultwarden = {
    lib,
    config,
    ...
  }: let
    cfg = config.vaultwarden;
    # Authelia's client for Vaultwarden. The secret is in nix-secrets twice:
    # the plaintext in this host's file, for Vaultwarden, and its digest in the
    # Authelia host's, for Authelia.
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
          logging in through the flake's Authelia (`oidcIssuer`) over OpenID
          Connect. SSO replaces the email step only: the master password still
          decrypts the vault. A first SSO login creates an account, or joins
          the existing one with the same (verified) email. It needs the client
          secret as `authelia/oidc/clients/vaultwarden/secret` in this host's
          nix-secrets file (plaintext, for Vaultwarden) and `…/secret-digest`
          in the Authelia host's (its PBKDF2 digest)
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

      smtp.enable = lib.mkEnableOption ''
        email (new-device sign-in notices, emergency access) through the SMTP
        relay (NetbirdServer's `smtp`), from `infra.mailDomain`. It needs
        `smtp/{host,username,password}` in the host's nix-secrets file (`just
        store-secret <host> --stack NetbirdServer smtp/host smtp/username
        smtp/password`)
      '';
    };

    config = lib.mkIf cfg.enable (lib.mkMerge [
      (lib.mkIf cfg.sso.enable {
        services.vaultwarden.config = {
          SSO_ENABLED = true;
          SSO_ONLY = cfg.sso.only;
          SSO_AUTHORITY = config.oidcIssuer;
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

        # Confidential, with PKCE. Vaultwarden reads email and name from
        # userinfo, so the default, minimal ID token is enough; an opaque
        # access token comes with `expires_in`, which Vaultwarden falls back
        # to. Sessions are Vaultwarden's own, so no refresh tokens.
        oidcClients.${ssoClientId} = {
          name = "Vaultwarden";
          secretDigest = ssoSecretDigest;
          # Vaultwarden derives it from DOMAIN.
          redirectUris = ["https://${config.services.vaultwarden.domain}/identity/connect/oidc-signin"];
        };

        sops.secrets.${ssoSecret}.restartUnits = ["vaultwarden.service"];
      })
      (lib.mkIf cfg.smtp.enable {
        # STARTTLS on the submission port; host and credentials come from
        # vaultwarden.env.
        services.vaultwarden.config = {
          SMTP_PORT = 587;
          SMTP_SECURITY = "starttls";
          SMTP_FROM = "vault@${infra.mailDomain}";
          SMTP_FROM_NAME = "Vaultwarden";
        };

        sops.secrets = lib.genAttrs ["smtp/host" "smtp/username" "smtp/password"] (_: {
          restartUnits = ["vaultwarden.service"];
        });
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
            ''
            + lib.optionalString cfg.smtp.enable ''
              SMTP_HOST=${config.sops.placeholder."smtp/host"}
              SMTP_USERNAME=${config.sops.placeholder."smtp/username"}
              SMTP_PASSWORD=${config.sops.placeholder."smtp/password"}
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
