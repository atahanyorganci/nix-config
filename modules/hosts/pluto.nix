{
  config,
  inputs,
  ...
}: let
  user = config.flake.me;
  plutoHomeConfiguration = {user, ...}: {
    home = {
      username = user.username;
      homeDirectory = "/home/${user.username}";
    };
    gpg.enable = true;
    gpg.agent.enable = false;
    git.user = {
      inherit (user) name email key;
    };
    shell = {
      bash.enable = true;
      zsh.enable = true;
      fish.enable = true;
    };
  };
  plutoNixosModule = {user, ...}: {
    hostInventory.role = null;
    hetzner = {
      enable = true;
      consoleAutologin = true;
    };
    networking.hostName = "pluto";
    time.timeZone = "Europe/Istanbul";
    programs.${user.shell}.enable = true;
    # Key-only SSH; allow remote nixos-rebuild --elevate=sudo.
    ssh.enable = true;
    systemd.services.sshd.serviceConfig.LimitNOFILE = 524288;
    security.sudo.wheelNeedsPassword = false;
  };
in {
  flake = {
    nixosConfigurations.pluto = inputs.nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        plutoNixosModule
        {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.verbose = true;
          home-manager.users.${user.username}.imports = [
            config.flake.modules.homeManager.default
            plutoHomeConfiguration
          ];
          home-manager.extraSpecialArgs = {
            inherit user inputs;
          };
        }
        config.flake.modules.nixos.default
      ];
      specialArgs = {
        inherit inputs user;
      };
    };
  };
}
