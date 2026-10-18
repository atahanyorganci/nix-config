{
  config,
  lib,
  ...
}: let
  allSystems =
    config.flake.nixosConfigurations // config.flake.darwinConfigurations;

  withProviders = lib.filterAttrs (_: sys: sys.config.identityProviders != {}) allSystems;

  extract = name: sys: {
    inherit name;
    providers = sys.config.identityProviders;
    # The host's nix-secrets file at the locked revision, the one it deploys,
    # which holds the providers' client secrets. Null when it has none.
    secretsFile =
      if sys.options.sops.defaultSopsFile.isDefined
      then sys.config.sops.defaultSopsFile
      else null;
  };

  identityProviders = lib.mapAttrs extract withProviders;

  # Providers are created by key, and NetBird adopts by name: both must be
  # unique across hosts.
  keys = lib.concatMap (h: lib.attrNames h.providers) (lib.attrValues identityProviders);
  names = lib.concatMap (h: map (p: p.name) (lib.attrValues h.providers)) (lib.attrValues identityProviders);
in {
  options.flake.identityProviders = lib.mkOption {
    type = lib.types.raw;
    description = "NetBird identity providers inferred from NixOS and Darwin configurations";
  };

  config.flake.identityProviders =
    if lib.length keys != lib.length (lib.unique keys)
    then throw "flake.identityProviders: the same provider key is declared on more than one host"
    else if lib.length names != lib.length (lib.unique names)
    then throw "flake.identityProviders: two providers share a name, which NetBird adopts by"
    else identityProviders;
}
