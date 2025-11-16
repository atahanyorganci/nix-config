{
  description = "NixOS configuration for Atahan's MacBook Pro";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    nix-darwin = {
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
    vscode-server = {
      url = "github:nix-community/nixos-vscode-server";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  outputs =
    inputs@{ systems
    , nixpkgs
    , nix-darwin
    , home-manager
    , stylix
    , vscode-server
    , ...
    }:
    let
      user = {
        name = "Atahan Yorgancı";
        email = "atahanyorganci@hotmail.com";
        username = "atahan";
        shell = "fish";
        key = "277004B9D6B7DCE3";
        authorizedKeys = [
          "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOjQEQWwP1aWkv4t/nzin3rRn7ueC7HWR+g9Tec1nwuS"
        ];
      };
      workUser = {
        inherit (user) name username shell;
        email = "atahan.yorganci@synnada.ai";
        key = "EE530DF5F568D5EB";
      };
      eachSystem = f: nixpkgs.lib.genAttrs (import systems) (system: f nixpkgs.legacyPackages.${system});
    in
    {
      formatter = eachSystem (pkgs: pkgs.nixpkgs-fmt);
      darwinConfigurations = {
        personal = import ./hosts/macbook-pro {
          inherit inputs user;
        };
        work = import ./hosts/macbook-pro {
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
        specialArgs = {
          inherit inputs user;
        };
      };
      nixosConfigurations.mercury = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          ./hosts/mercury
          vscode-server.nixosModules.default
          home-manager.nixosModules.home-manager
          stylix.nixosModules.stylix
          {
            home-manager.useGlobalPkgs = true;
            home-manager.useUserPackages = true;
            home-manager.verbose = true;
            home-manager.users.${user.username} = ./hosts/mercury/home.nix;
            home-manager.extraSpecialArgs = { inherit user inputs; };
          }
          ./modules/nixos
          ./modules/shared
        ];
        specialArgs = {
          inherit inputs user;
        };
      };
    };
}
