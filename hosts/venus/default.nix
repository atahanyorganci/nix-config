{
  config,
  inputs,
  ...
}: let
  user = config.flake.me;
in {
  flake.darwinConfigurations.venus = inputs.nix-darwin.lib.darwinSystem {
    system = "aarch64-darwin";
    modules = [
      ./system.nix
      inputs.home-manager.darwinModules.home-manager
      inputs.stylix.darwinModules.stylix
      {
        home-manager.useGlobalPkgs = true;
        home-manager.useUserPackages = true;
        home-manager.verbose = true;
        home-manager.users.${user.username} = {...}: {
          imports = [
            config.flake.modules.homeManager.default
            ./home.nix
          ];
        };
        home-manager.extraSpecialArgs = {
          inherit user inputs;
        };
      }
      config.flake.modules.darwin.default
    ];
    specialArgs = {
      inherit inputs user;
    };
  };
}
