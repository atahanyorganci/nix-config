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
    nixos-generators = {
      url = "github:nix-community/nixos-generators";
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
        authorizedKeys = [
          "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC75O5TAYx+fWkSe58f8ULmSUHoJyF8Gul83AM0TYuuHZrGMa3w29AaFCInnZYtKMblLcE1DqJrdaDOSfgILjnEpqpRZNklZKyZXLXNRaCBZjgvfJetNin+EgH0iJRy8ZMfWq17vvsQJ+b0xvYSmfGk6RX4z73Pelmim9+l+yXyZZHUgA2R6zYq3J3RL/m1NtyWSxkY2e22ZX5/hhV8mJCuSsNzF+BTSg0HO332MM5QyNajaTZ+19ieytmWlixGYlq228Co7yBazAL3Sh4kS12r2g0cB0P+YWdc8LOa1+0QrEVtLTo/pDso3kb9v3GD5BoEmIWRyOd0DyGYG5x7T9aIiJgXjFNhtavHpEa38a0nvD55b0St9UDB1XjPSRNJHtRSoYl9K/OQcX6Pa3VlRcwnIa4pwH4ZAz4QJF9JgX51EPRFXlUCOYX7m9utUe3Qvp9F1BG5mE3v+Rti0NnCMoFQ4eJwoGSsbtlse+SkvniGnprw3EmVcMmTl2RLKuq+oyL6nmhQxctXDUBnk4iUWx/+z4Ly1Lot7nw/y4CQBOTqmXAXzQCcOr6aTHJmVZoCABnbkJgvCRhd45EKCmbv6FfqpfiDkRrvLYmCB4lySnYynbYt3pfGJP6ivWz0RaIoC8mHDcsVFv7S7fYqZJi9vZDxF11SDo0ImQFxSAa2MRRS8Q=="
        ];
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
