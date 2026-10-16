{
  config,
  inputs,
  ...
}: let
  user = config.flake.me;
  venusHomeConfiguration = {user, ...}: {
    agents.enable = true;
    # Public keys + gpg CLI; no local agent (use forwarded YubiKey from sol).
    gpg.enable = true;
    gpg.agent.enable = false;
    ffmpeg.enable = true;
    git = {
      enable = true;
      aliases.enable = true;
      user = {
        inherit (user) name email key;
      };
    };
    gum.enable = true;
    node.enable = true;
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
  venusDarwinModule = {
    pkgs,
    user,
    inputs,
    ...
  }: {
    hostInventory.role = "managedTarget";
    hostInventory.netbird.group = "Servers";
    hostInventory.ssh.localHostName.enable = true;
    # macOS's own key: verified over the NetBird mesh and the LAN, and matching
    # known_hosts, on 2026-10-05. Reinstalling macOS generates a new one.
    hostInventory.ssh.hostKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN6ZVEaeBBJO/0CieSAKNbFZz2Ob2WdRYwlDfvdwjHoe";
    # Hostname
    networking.hostName = "venus";
    # Disable `nix-darwin` documentation
    documentation.enable = false;
    # Work around nix-darwin manual generation failing with newer nixos-render-docs.
    # The uninstaller builds its own default Darwin system, which still enables docs.
    system.tools.darwin-uninstaller.enable = false;
    # Enable entering sudo mode with Touch ID.
    security.pam.services.sudo_local.touchIdAuth = true;
    security.sudo.extraConfig = ''
      ${user.username} ALL=(ALL) NOPASSWD: ALL
    '';
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
    # Arr Stack
    arr-stack = {
      enable = true;
      domain = "yorganci.dev";
    };
    # Calibre
    calibre-web = {
      enable = true;
      listen.ip = "0.0.0.0";
      options.enableBookUploading = true;
    };
    # SMB file sharing (replaces Apple's File Sharing)
    samba = {
      enable = true;
      # Loopback, the LAN and the NetBird mesh (CGNAT range).
      hostsAllow = ["127.0.0.1" "192.168.1.0/24" "100.64.0.0/10"];
      bonjour.model = "Macmini9,1";
      users.${user.username}.passwordFile = "/var/lib/samba-passwords/${user.username}";
      shares.Media = {
        path = "/Volumes/Atahan/Videos";
        comment = "Movies and TV shows";
        validUsers = [user.username];
        writeList = [user.username];
      };
    };
    # SSH
    ssh.enable = true;
    # Self-hosted NetBird mesh
    netbird = {
      enable = true;
      setupKeyFile = "/var/lib/netbird-client/setup.key";
    };
  };
in {
  flake = {
    darwinConfigurations.venus = inputs.nix-darwin.lib.darwinSystem {
      system = "aarch64-darwin";
      modules = [
        venusDarwinModule
        {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.verbose = true;
          home-manager.users.${user.username} = {...}: {
            imports = [
              config.flake.modules.homeManager.default
              venusHomeConfiguration
            ];
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
