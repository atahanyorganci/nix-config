{
  pkgs,
  user,
  inputs,
  ...
}: {
  # Hostname
  networking.hostName = "mini";
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
    options.enableBookUploading = true;
  };
  # SSH
  ssh.enable = true;
  # Self-hosted NetBird mesh
  netbird = {
    enable = true;
    setupKeyFile = "/var/lib/netbird-client/setup.key";
  };
  # Local LLM inference (Apple Silicon menu bar app + CLI)
  environment.systemPackages = [pkgs.omlx];
  # Upstream CLI/diagnostics hardcode /Applications/oMLX.app
  system.activationScripts.postActivation.text = ''
    echo "Installing oMLX.app to /Applications..."
    rm -rf /Applications/oMLX.app
    cp -a ${pkgs.omlx}/Applications/oMLX.app /Applications/oMLX.app
    chmod -R u+w /Applications/oMLX.app
    /usr/bin/codesign --force --deep --sign - /Applications/oMLX.app
    chown -R ${user.username}:staff /Applications/oMLX.app
  '';
}
