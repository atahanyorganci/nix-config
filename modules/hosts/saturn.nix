{
  config,
  inputs,
  ...
}: let
  user = config.flake.me;
  saturnHomeConfiguration = {user, ...}: {
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
  saturnNixosModule = {user, ...}: {
    hostInventory.role = "managedTarget";
    hostInventory.netbird.group = "Servers";
    aws.enable = true;
    networking.hostName = "saturn";
    time.timeZone = "Europe/Istanbul";
    # Keep target-side Nix builds within t4g.medium (4 GiB) memory limits.
    nix.settings = {
      max-jobs = 1;
      cores = 2;
    };
    programs.${user.shell}.enable = true;
    # Key-only SSH; allow remote nixos-rebuild --elevate=sudo.
    ssh.enable = true;
    systemd.services.sshd.serviceConfig.LimitNOFILE = 524288;
    security.sudo.wheelNeedsPassword = false;
    netbird = {
      enable = true;
      setupKeyFile = "/var/lib/netbird-client/setup.key";
    };
  };
in {
  flake = {
    nixosConfigurations.saturn = inputs.nixpkgs.lib.nixosSystem {
      system = "aarch64-linux";
      modules = [
        saturnNixosModule
        {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.verbose = true;
          home-manager.users.${user.username}.imports = [
            config.flake.modules.homeManager.default
            saturnHomeConfiguration
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
