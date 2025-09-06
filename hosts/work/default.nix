{ pkgs, user, inputs, ... }:
let
  # User ID created by MacOS for the user use `id -u` to get it.
  uid = 501;
in
{
  # Disable `nix-darwin` documentation
  documentation.enable = false;
  # Allow `nix-darwin` to manage `nix`
  nix.enable = false;
  # Applications installed by Homebrew
  homebrew.casks = [
    "google-chrome"
    "spotify"
    "orbstack"
    "cloudflare-warp"
    "orbstack"
  ];
  # Enable entering sudo mode with Touch ID.
  security.pam.services.sudo_local.touchIdAuth = true;
  # Set Git commit hash for darwin-version.
  system.configurationRevision = inputs.self.rev or inputs.self.dirtyRev or null;
  # Ensures compatibility with defaults from NixOS
  system.stateVersion = 4;
  # User used for options that previously applied to the user running `darwin-rebuild`
  system.primaryUser = user.username;
  # Users managed by Nix
  users.knownUsers = [ user.username ];
  users.users.${user.username} = {
    name = user.username;
    description = user.name;
    home = "/Users/${user.username}";
    shell = pkgs.${user.shell};
    uid = uid;
  };
}
