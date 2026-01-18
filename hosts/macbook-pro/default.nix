{ config
, inputs
, ...
}:
let
  user = config.flake.me;
in
{
  flake.darwinConfigurations.personal = inputs.nix-darwin.lib.darwinSystem {
    system = "aarch64-darwin";
    modules = [
      ./system.nix
      inputs.home-manager.darwinModules.home-manager
      inputs.stylix.darwinModules.stylix
      {
        home-manager.useGlobalPkgs = true;
        home-manager.useUserPackages = true;
        home-manager.verbose = true;
        home-manager.users.${user.username} = ./home.nix;
        home-manager.extraSpecialArgs = {
          inherit user inputs;
        };
      }
      config.flake.darwinModules.firefox
      config.flake.darwinModules.homebrew
      config.flake.darwinModules.shell
      config.flake.darwinModules.system
      (inputs.self + /modules/shared)
    ];
    specialArgs = {
      inherit inputs user;
    };
  };
}
