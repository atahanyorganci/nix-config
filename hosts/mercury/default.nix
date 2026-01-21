{
  config,
  inputs,
  ...
}: let
  user = config.flake.me;
in {
  flake.nixosConfigurations.mercury = inputs.nixpkgs.lib.nixosSystem {
    system = "x86_64-linux";
    modules = [
      ./system.nix
      ./hardware-configuration.nix
      inputs.stylix.nixosModules.stylix
      inputs.vscode-server.nixosModules.default
      inputs.home-manager.nixosModules.home-manager
      {
        home-manager.useGlobalPkgs = true;
        home-manager.useUserPackages = true;
        home-manager.verbose = true;
        home-manager.users.${user.username} = {...}: {
          imports = [
            config.flake.homeModules.default
            ./home.nix
          ];
        };
        home-manager.extraSpecialArgs = {
          inherit user inputs;
        };
      }
      config.flake.nixosModules.default
      config.flake.nixosModules.shared
    ];
    specialArgs = {
      inherit inputs user;
    };
  };
}
