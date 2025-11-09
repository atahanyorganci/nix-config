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
        key = "F3F2B2EDB7562F09";
        authorizedKeys = [
          "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDJpxbjpFmE5twzeMoite14xhWxJumHMMILZTcpp7EHO+Nv6gDG0/aAGpLI69Gq+Gl/yCaBBeuW4Ihgf/WwbiU3B3bI53pigvc3bc9ntANrz3YtpQntQNnXW8kTQuPllLQNOfjfsXt6jHel+Rdpg/ImEZGbsks4JMcNTAm7fUGKjdHYz2ByRTbS2Nshq3eFKMzcXWZHCDPveX9WQY0W3JCxZqHzcpTbATHWoMCi5/VZmg23P9IhrmkFGHtf0rC2uLGBYEwcq+IfcBcWcifbpkdbOo9putm+3z2GNTZ03rrDmpPdKiD08pkBzYCy1cC7S71PoGI2ybx/5LfjDSyPecyzItMw0yLVB02inqEUqV8CPzcPf11krTXGVg+9/ay1k/hbnvHNvuPRnO078QsZKdHp/6yA5ornHOh9GAyl/UlJ3T0hm2XJWGY7QOr2LQkjirBxH8v7UKG6rSi9P2J3rMo1OXxFo4OqTgz8g9SfBijxT3R7TMUmX4ZvY/EyPxYUTkoBTWzApEnfyMyy0BkHUGOaRY+75iAJrD1TshFYR+OXxjWWhbteBGLHp98SxfSJobF/hxLFMVR9CnOabI3m7rg1VKK15A8JCSts+Bl0vqwjpM4Q7CfGbQYtSldJFp8uj2yHKgvtiU8iB94XRFvQkqT6p+I+qznWUDdN6Mzrav8CtQ=="
        ];
      };
      workUser = {
        inherit (user) name username shell;
        email = "atahan.yorganci@synnada.ai";
        key = "EE530DF5F568D5EB";
      };
      flakePath = ./.;
      eachSystem = f: nixpkgs.lib.genAttrs (import systems) (system: f nixpkgs.legacyPackages.${system});
    in
    {
      formatter = eachSystem (pkgs: pkgs.nixpkgs-fmt);
      darwinConfigurations = {
        personal = import ./hosts/macbook-pro {
          inherit inputs user flakePath;
        };
        work = import ./hosts/macbook-pro {
          inherit inputs flakePath;
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
      nixosConfigurations.yoga = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          ./hosts/yoga
          vscode-server.nixosModules.default
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
        specialArgs = {
          inherit inputs user;
        };
      };
    };
}
