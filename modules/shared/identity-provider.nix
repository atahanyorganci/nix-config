{...}: let
  module = {lib, ...}: {
    options.identityProviders = lib.mkOption {
      type = lib.types.attrsOf (lib.types.submodule ({name, ...}: {
        options = {
          name = lib.mkOption {
            type = lib.types.str;
            default = name;
            description = "Name on the button NetBird's login page offers for the provider.";
          };
          type = lib.mkOption {
            type = lib.types.enum ["oidc" "zitadel" "entra" "google" "okta" "pocketid" "microsoft" "adfs"];
            default = "oidc";
            description = "Connector type; changing it replaces the provider.";
          };
          issuer = lib.mkOption {
            type = lib.types.str;
            description = ''
              OIDC issuer URL, exactly as its discovery document states it.
              NetBird fetches the document whenever the stack creates or updates
              the provider, so the issuer has to be up first.
            '';
          };
          clientId = lib.mkOption {
            type = lib.types.str;
            description = "OAuth2 client ID registered with the provider.";
          };
          clientSecret = lib.mkOption {
            type = lib.types.str;
            example = "authelia/oidc/clients/netbird/secret";
            description = ''
              Key of the plaintext client secret in this host's nix-secrets file
              (`hosts/<host>.yaml`), `/`-separated like a sops-nix secret name.
              The stack decrypts it with the admin key when it plans, at the
              revision the flake locks; it is not installed on the host.
            '';
          };
        };
      }));
      default = {};
      description = ''
        External identity providers for NetBird's embedded IdP whose client
        secret is in this host's nix-secrets file. The HomeInfra stack creates
        them (`flake.identityProviders`).
      '';
    };
  };
in {
  flake.modules.nixos.identity-provider = module;
  flake.modules.darwin.identity-provider = module;
}
