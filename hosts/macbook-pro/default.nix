{ inputs
, user
, ...
}:
inputs.nix-darwin.lib.darwinSystem {
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
    (inputs.self + /modules/nix-darwin)
    (inputs.self + /modules/shared)
  ];
  specialArgs = {
    inherit user inputs;
  };
}
