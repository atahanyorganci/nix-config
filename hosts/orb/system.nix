{
  pkgs,
  modulesPath,
  user,
  ...
}: {
  imports = [
    # Include the default lxd configuration.
    "${modulesPath}/virtualisation/lxc-container.nix"
    # Include the OrbStack-specific configuration.
    ./orbstack.nix
  ];
  users.users.${user.username}.extraGroups = ["wheel"];
  programs.${user.shell}.enable = true;
  programs.gnupg.agent = {
    enable = true;
    pinentryPackage = pkgs.pinentry-tty;
    enableSSHSupport = true;
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
