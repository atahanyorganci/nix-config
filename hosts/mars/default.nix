{
  config,
  inputs,
  ...
}: let
  user = config.flake.me;
in {
  flake.nixosConfigurations.mars = inputs.nixpkgs.lib.nixosSystem {
    system = "x86_64-linux";
    modules = [
      ./system.nix
      {
        home-manager.useGlobalPkgs = true;
        home-manager.useUserPackages = true;
        home-manager.verbose = true;
        home-manager.users.${user.username}.imports = [
          config.flake.modules.homeManager.default
          ./home.nix
        ];
        home-manager.extraSpecialArgs = {
          inherit user inputs;
        };
      }
      config.flake.modules.nixos.default
    ];
    specialArgs = {
      inherit inputs user;
    };
  };
}
