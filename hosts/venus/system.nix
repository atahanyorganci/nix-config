{
  pkgs,
  user,
  inputs,
  ...
}: {
  hostInventory.role = "managedTarget";
  # Hostname
  networking.hostName = "venus";
  # Disable `nix-darwin` documentation
  documentation.enable = false;
  # Work around nix-darwin manual generation failing with newer nixos-render-docs.
  # The uninstaller builds its own default Darwin system, which still enables docs.
  system.tools.darwin-uninstaller.enable = false;
  # Disable `nix-darwin` to manage Nix because of Determinate Systems Nix
  nix.enable = false;
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
    # User ID created by MacOS for the user use `id -u` to get it.
    uid = 501;
  };
  # Orbstack OCI runtime
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
  # SSH
  ssh.enable = true;
  # Self-hosted NetBird mesh
  netbird = {
    enable = true;
    setupKeyFile = "/var/lib/netbird-client/setup.key";
  };
  services.omlx = {
    enable = true;
    settings = {
      ssd-cache-max-size = "22GB";
      skip-api-key-verification = true;
    };
  };
}
