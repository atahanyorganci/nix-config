{ config
, inputs
, ...
}:
let
  user = config.flake.me;
in
{
  flake.nixosConfigurations.orb = inputs.nixpkgs.lib.nixosSystem {
    system = "aarch64-linux";
    modules = [
      ./system.nix
      inputs.home-manager.nixosModules.home-manager
      inputs.stylix.nixosModules.stylix
      {
        home-manager.useGlobalPkgs = true;
        home-manager.useUserPackages = true;
        home-manager.verbose = true;
        home-manager.users.${user.username} = ./home.nix;
        home-manager.extraSpecialArgs = { inherit user inputs; };
      }
      config.flake.nixosModules.default
      ../../modules/shared
    ];
    specialArgs = {
      inherit inputs user;
    };
  };
}
