{ lib
, config
, pkgs
, ...
}:
{
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
}
