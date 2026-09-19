{
  config,
  inputs,
  ...
}: let
  user = config.flake.me;
  solHomeConfiguration = {user, ...}: {
    agents.enable = true;
    ffmpeg.enable = true;
    ghostty.enable = true;
    git = {
      enable = true;
      aliases.enable = true;
      user = {
        inherit (user) name email key;
      };
    };
    gpg.enable = true;
    gum.enable = true;
    python.enable = true;
    shell = {
      bash.enable = true;
      fish.enable = true;
      zsh.enable = true;
    };
    tools.enable = true;
    uutils.enable = true;
    wget.enable = true;
    zed.enable = true;
  };
  solDarwinModule = {
    pkgs,
    user,
    inputs,
    ...
  }: {
    hostInventory.role = "agentHolder";
    # Disable `nix-darwin` documentation
    documentation.enable = false;
    # Work around nix-darwin manual generation failing with newer nixos-render-docs.
    # The uninstaller builds its own default Darwin system, which still enables docs.
    system.tools.darwin-uninstaller.enable = false;
    # Disable `nix-darwin` to manage Nix because of Determinate Systems Nix
    nix.enable = false;
    # Enable entering sudo mode with Touch ID.
    security.pam.services.sudo_local.touchIdAuth = true;
    # Set Git commit hash for darwin-version.
    system.configurationRevision = inputs.self.rev or inputs.self.dirtyRev or null;
    # Ensures compatibility with defaults from NixOS
    system.stateVersion = 4;
    # User used for options that previously applied to the user running `darwin-rebuild`
    system.primaryUser = user.username;
    # Users managed by Nix
    users.knownUsers = [user.username];
    users.users.${user.username} = {
      name = user.username;
      description = user.name;
      home = "/Users/${user.username}";
      shell = pkgs.${user.shell};
      # User ID created by MacOS for the user use `id -u` to get it.
      uid = 501;
    };
    # Orbstack OCI runtime
    orbstack.enable = true;
    # Self-hosted NetBird mesh (daemon + UI)
    netbird = {
      enable = true;
      package = pkgs.netbird-app;
    };
    homebrew.casks = [
      "fluidvoice"
      "spotify"
    ];
  };
in {
  flake = {
    darwinConfigurations.sol = inputs.nix-darwin.lib.darwinSystem {
      system = "aarch64-darwin";
      modules = [
        solDarwinModule
        {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.verbose = true;
          home-manager.users.${user.username} = {...}: {
            imports = [
              config.flake.modules.homeManager.default
              solHomeConfiguration
            ];
            gpg.managedTargets = config.flake.inventory.managedTargets;
          };
          home-manager.extraSpecialArgs = {
            inherit user inputs;
          };
        }
        config.flake.modules.darwin.default
      ];
      specialArgs = {
        inherit inputs user;
      };
    };
  };
}
