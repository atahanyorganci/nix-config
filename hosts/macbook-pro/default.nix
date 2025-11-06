{ inputs
, user
, flakePath
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
    (flakePath + /modules/nix-darwin)
    (flakePath + /modules/shared)
  ];
  specialArgs = {
    inherit user inputs;
  };
}
