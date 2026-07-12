{
  config,
  inputs,
  ...
}: let
  user = config.flake.me;
  inherit (config.flake.modules) nixos homeManager;
in {
  flake.nixosConfigurations.hetzner = inputs.nixpkgs.lib.nixosSystem {
    system = "x86_64-linux";
    modules = [
      ./system.nix
      inputs.disko.nixosModules.disko
      inputs.stylix.nixosModules.stylix
      inputs.home-manager.nixosModules.home-manager
      {
        home-manager.useGlobalPkgs = true;
        home-manager.useUserPackages = true;
        home-manager.verbose = true;
        home-manager.users.${user.username}.imports = [
          homeManager.base
          homeManager.git
          homeManager.shell
          homeManager.tools
          ./home.nix
        ];
        home-manager.extraSpecialArgs = {
          inherit user inputs;
        };
      }
      nixos.default
    ];
    specialArgs = {
      inherit inputs user;
    };
  };
}
