{config, ...}: let
  infra = config.flake.infra;
in {
  flake.modules.nixos.vaultwarden = {
    lib,
    config,
    ...
  }: let
    cfg = config.vaultwarden;
  in {
    options.vaultwarden = {
      enable = lib.mkEnableOption ''
        a Vaultwarden server keeping its vault in the infra Postgres cluster
        (HomeInfra's `postgres.roles.vaultwarden`). It needs
        `vaultwarden/database-url` in the host's nix-secrets file (`just
        store-secret <host> vaultwarden/database-url=postgres/roles/vaultwarden`)
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
          Let anyone who reaches the service create an account. Off, accounts
          come only from organization invitations.
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
    };

    config = lib.mkIf cfg.enable {
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
        content = ''
          DATABASE_URL=${config.sops.placeholder."vaultwarden/database-url"}
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
    };
  };
}
