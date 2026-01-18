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
    flake-parts.url = "github:hercules-ci/flake-parts";
    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  outputs =
    inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      flake = {
        me = {
          name = "Atahan Yorgancı";
          email = "atahanyorganci@hotmail.com";
          username = "atahan";
          shell = "fish";
          key = "277004B9D6B7DCE3";
          authorizedKeys = [
            "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOjQEQWwP1aWkv4t/nzin3rRn7ueC7HWR+g9Tec1nwuS"
          ];
        };
      };
      imports = [
        inputs.treefmt-nix.flakeModule
        ./treefmt.nix
        ./hosts/macbook-pro
        ./hosts/orb
        ./modules/darwin
        ./modules/home
        ./modules/nixos
        ./modules/shared
      ];
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      perSystem = { system, ... }: {
        _module.args.pkgs = import inputs.nixpkgs {
          inherit system;
          config = {
            allowUnfree = true;
            allowBroken = true;
          };
        };
      };
    };
}
