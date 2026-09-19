{
  config,
  inputs,
  ...
}: let
  user = config.flake.me;
  moonHomeConfiguration = {user, ...}: {
    ffmpeg.enable = true;
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
      zsh.enable = true;
      fish.enable = true;
    };
    tools.enable = true;
    uutils.enable = true;
    wget.enable = true;
  };
  # OrbStack-specific guest configuration.
  moonOrbstackModule = {
    lib,
    config,
    ...
  }: {
    environment.shellInit = ''
      . /opt/orbstack-guest/etc/profile-early
      . /opt/orbstack-guest/etc/profile-late
    '';
    # Enable documentation
    documentation.man.enable = true;
    documentation.doc.enable = true;
    documentation.info.enable = true;
    # Disable systemd-resolved
    services.resolved.enable = false;
    environment.etc."resolv.conf".source = "/opt/orbstack-guest/etc/resolv.conf";
    # Faster DHCP - OrbStack uses SLAAC exclusively
    networking = {
      resolvconf.enable = false;
      dhcpcd = {
        enable = false;
        extraConfig = ''
          noarp
          noipv6
        '';
      };
      useDHCP = false;
      useHostResolvConf = false;
    };
    # systemd
    systemd.network = {
      enable = true;
      networks."50-eth0" = {
        matchConfig.Name = "eth0";
        networkConfig = {
          DHCP = "ipv4";
          IPv6AcceptRA = true;
        };
        linkConfig.RequiredForOnline = "routable";
      };
    };
    systemd.services."systemd-oomd".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-userdbd".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-udevd".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-timesyncd".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-timedated".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-portabled".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-nspawn@".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-machined".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-localed".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-logind".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-journald@".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-journald".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-journal-remote".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-journal-upload".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-importd".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-hostnamed".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-homed".serviceConfig.WatchdogSec = 0;
    systemd.services."systemd-networkd".serviceConfig.WatchdogSec = lib.mkIf config.systemd.network.enable 0;
    # ssh config
    programs.ssh.extraConfig = ''
      Include /opt/orbstack-guest/etc/ssh_config
    '';
    # indicate builder support for emulated architectures
    nix.settings.extra-platforms = [
      "x86_64-linux"
      "i686-linux"
    ];
  };
  moonNixosModule = {
    pkgs,
    modulesPath,
    user,
    ...
  }: {
    imports = [
      # Include the default lxd configuration.
      "${modulesPath}/virtualisation/lxc-container.nix"
      # Include the OrbStack-specific configuration.
      moonOrbstackModule
    ];
    users.users.${user.username}.extraGroups = ["wheel"];
    programs.${user.shell}.enable = true;
    programs.gnupg.agent = {
      enable = true;
      pinentryPackage = pkgs.pinentry-tty;
      enableSSHSupport = true;
    };
    # Hostname of the system
    networking.hostName = "moon";
    # Disable password for `sudo` command.
    security.sudo.wheelNeedsPassword = false;
    # Timezone
    time.timeZone = "Europe/Istanbul";
    # Allow SSH
    ssh.enable = true;
  };
in {
  flake = {
    nixosConfigurations.moon = inputs.nixpkgs.lib.nixosSystem {
      system = "aarch64-linux";
      modules = [
        moonNixosModule
        {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.verbose = true;
          home-manager.users.${user.username} = {...}: {
            imports = [
              config.flake.modules.homeManager.default
              moonHomeConfiguration
            ];
          };
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
