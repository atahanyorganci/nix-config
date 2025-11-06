{
  description = "NixOS configuration for Atahan's MacBook Pro";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    darwin = {
      url = "github:LnL7/nix-darwin";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    firefox-nix-darwin = {
      url = "github:atahanyorganci/firefox-nix-darwin";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    firefox-addons = {
      url = "gitlab:rycee/nur-expressions?dir=pkgs/firefox-addons";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    stylix = {
      url = "github:danth/stylix";
      inputs.home-manager.follows = "home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    nix-casks = {
      url = "github:atahanyorganci/nix-casks/archive";
    };
  };
  outputs =
    inputs@{ systems
    , nixpkgs
    , darwin
    , home-manager
    , stylix
    , ...
    }:
    let
      user = {
        name = "Atahan Yorgancı";
        email = "atahanyorganci@hotmail.com";
        username = "atahan";
        shell = "fish";
        key = "F3F2B2EDB7562F09";
      };
      workUser = {
        inherit (user) name username shell;
        email = "atahan.yorganci@synnada.ai";
        key = "EE530DF5F568D5EB";
      };
      specialArgs = {
        inherit user inputs;
      };
      eachSystem = f: nixpkgs.lib.genAttrs (import systems) (system: f nixpkgs.legacyPackages.${system});
    in
    {
      formatter = eachSystem (pkgs: pkgs.nixpkgs-fmt);
      darwinConfigurations."Atahan-MacBook-Pro" = darwin.lib.darwinSystem {
        system = "aarch64-darwin";
        modules = [
          ./hosts/macbook-pro
          home-manager.darwinModules.home-manager
          stylix.darwinModules.stylix
          {
            home-manager.useGlobalPkgs = true;
            home-manager.useUserPackages = true;
            home-manager.verbose = true;
            home-manager.users.${user.username} = ./hosts/macbook-pro/home.nix;
            home-manager.extraSpecialArgs = specialArgs;
          }
          ./modules/nix-darwin
          ./modules/shared
        ];
        specialArgs = specialArgs;
      };
      darwinConfigurations."Atahans-Work-Macbook" = darwin.lib.darwinSystem {
        system = "aarch64-darwin";
        modules = [
          ./hosts/work
          home-manager.darwinModules.home-manager
          stylix.darwinModules.stylix
          {
            home-manager.useGlobalPkgs = true;
            home-manager.useUserPackages = true;
            home-manager.verbose = true;
            home-manager.users.${user.username} = ./hosts/work/home.nix;
            home-manager.extraSpecialArgs = {
              inherit inputs;
              user = workUser;
            };
          }
          ./modules/nix-darwin
          ./modules/shared
        ];

        specialArgs = {
          inherit inputs;
          user = workUser;
        };
      };
      nixosConfigurations.orb = nixpkgs.lib.nixosSystem {
        system = "aarch64-linux";
        modules = [
          ./hosts/orb
          home-manager.nixosModules.home-manager
          stylix.nixosModules.stylix
          {
            home-manager.useGlobalPkgs = true;
            home-manager.useUserPackages = true;
            home-manager.verbose = true;
            home-manager.users.${user.username} = ./hosts/orb/home.nix;
            home-manager.extraSpecialArgs = { inherit user inputs; };
          }
          ./modules/nixos
          ./modules/shared
        ];
        specialArgs = specialArgs;
      };
      nixosConfigurations.yoga = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          ./hosts/yoga
          home-manager.nixosModules.home-manager
          stylix.nixosModules.stylix
          {
            home-manager.useGlobalPkgs = true;
            home-manager.useUserPackages = true;
            home-manager.verbose = true;
            home-manager.users.${user.username} = ./hosts/yoga/home.nix;
            home-manager.extraSpecialArgs = { inherit user inputs; };
          }
          ./modules/nixos
          ./modules/shared
        ];
        specialArgs = specialArgs;
      };
    };
}
