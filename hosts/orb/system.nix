{ pkgs
, modulesPath
, user
, inputs
, ...
}:
{
  imports = [
    # Include the default lxd configuration.
    "${modulesPath}/virtualisation/lxc-container.nix"
    # Include the OrbStack-specific configuration.
    ./orbstack.nix
  ];
  users.users.${user.username}.extraGroups = [ "wheel" ];
  programs.${user.shell}.enable = true;
  programs.gnupg.agent = {
    enable = true;
    pinentryPackage = pkgs.pinentry-tty;
    enableSSHSupport = true;
  };
  # Enable Home Manager for the user
  home-manager.useGlobalPkgs = true;
  home-manager.useUserPackages = true;
  home-manager.verbose = true;
  home-manager.users.${user.username} = ./home.nix;
  home-manager.extraSpecialArgs = {
    inherit user inputs;
  };
  # Hostname of the system
  networking.hostName = "orb";
  # Disable password for `sudo` command.
  security.sudo.wheelNeedsPassword = false;
  # Timezone
  time.timeZone = "Europe/Istanbul";
  # Allow SSH
  ssh.enable = true;
}
