{
  config,
  lib,
  ...
}: let
  # The one NixOS host running Authelia: its URL is the issuer of every client
  # any host declares, and it registers them all.
  autheliaHosts = lib.filterAttrs (_: system: system.config.authelia.enable or false) config.flake.nixosConfigurations;
  issuer =
    if lib.length (lib.attrNames autheliaHosts) == 1
    then (lib.head (lib.attrValues autheliaHosts)).config.authelia.url
    else throw "oidcIssuer: expected exactly one host with `authelia.enable`, found ${toString (lib.attrNames autheliaHosts)}";

  client = {name, ...}: {
    options = {
      name = lib.mkOption {
        type = lib.types.str;
        default = name;
        description = "Display name (`client_name`), shown when Authelia asks for consent.";
      };

      redirectUris = lib.mkOption {
        type = lib.types.nonEmptyListOf lib.types.str;
        description = "Exact redirect URIs the client may send users back to.";
      };

      public = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = ''
          A client without a secret, authenticated by PKCE alone
          (`token_endpoint_auth_method: none`). Otherwise it is confidential and
          needs `secretDigest`.
        '';
      };

      secretDigest = lib.mkOption {
        type = lib.types.nullOr lib.types.str;
        default = null;
        example = "authelia/oidc/clients/example/secret-digest";
        description = ''
          Key of the client secret's PBKDF2 digest in the **Authelia host's**
          nix-secrets file, `/`-separated like a sops-nix secret name. The
          plaintext belongs to the client's own host.
        '';
      };

      scopes = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = ["openid" "profile" "email"];
        description = "Scopes the client may request.";
      };

      pkce = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Require PKCE (S256). Off only for a client that cannot send it.";
      };

      idTokenClaims = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [];
        example = ["email" "email_verified" "name" "preferred_username"];
        description = ''
          Claims to put in the ID token besides the standard ones, for a client
          that reads the user from the ID token instead of userinfo. Authelia
          leaves profile and email claims out of ID tokens by default.
        '';
      };

      groups = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [];
        example = ["admin"];
        description = ''
          LLDAP groups whose members may use the client; any one suffices. Empty
          lets every user in. Two factors are required either way.
        '';
      };

      settings = lib.mkOption {
        type = lib.types.attrsOf lib.types.anything;
        default = {};
        description = ''
          Further Authelia client settings (`identity_providers.oidc.clients`),
          which win over the ones derived from the options above.
        '';
      };
    };
  };

  module = {lib, ...}: {
    options.oidcIssuer = lib.mkOption {
      type = lib.types.str;
      readOnly = true;
      default = issuer;
      defaultText = lib.literalMD "`authelia.url` of the flake's one host with `authelia.enable`";
      description = "OpenID Connect issuer for the services on this host: the flake's Authelia.";
    };

    options.oidcClients = lib.mkOption {
      type = lib.types.attrsOf (lib.types.submodule client);
      default = {};
      description = ''
        OpenID Connect clients this host's services need, by client ID. The
        Authelia host registers every host's, so a client declared here is
        live once the Authelia host is deployed (then this one). Client IDs
        are unique across the flake.
      '';
    };
  };
in {
  flake.modules.nixos.oidc-client = module;
  flake.modules.darwin.oidc-client = module;
}
