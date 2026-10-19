{
  config,
  lib,
  ...
}: let
  allSystems =
    config.flake.nixosConfigurations // config.flake.darwinConfigurations;

  meshServices = lib.filterAttrs (_: host: host.services != {}) (
    lib.mapAttrs (name: system: {
      inherit name;
      services = system.config.meshServices;
    })
    allSystems
  );
in {
  options.flake.meshServices = lib.mkOption {
    type = lib.types.raw;
    description = "Services reached directly over the mesh, inferred from NixOS and Darwin configurations";
  };

  config.flake.meshServices = meshServices;
}
