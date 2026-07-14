{user, ...}: {
  # Hetzner Cloud (KVM): virtio must be in the initrd or root never appears.
  boot.initrd.availableKernelModules = [
    "ahci"
    "xhci_pci"
    "virtio_pci"
    "virtio_scsi"
    "virtio_blk"
    "virtio_net"
    "sd_mod"
    "sr_mod"
  ];
  boot.initrd.kernelModules = [];
  boot.kernelModules = [];
  boot.extraModulePackages = [];
  nixpkgs.hostPlatform = "x86_64-linux";
  # Hetzner Cloud boots in BIOS mode; disko provides the EF02 partition.
  boot.loader.grub = {
    enable = true;
    devices = ["/dev/sda"];
    efiSupport = true;
    efiInstallAsRemovable = true;
  };
  # disko is used to create the disk layout.
  disko.devices = {
    disk = {
      main = {
        type = "disk";
        device = "/dev/sda";
        content = {
          type = "gpt";
          partitions = {
            boot = {
              size = "1M";
              type = "EF02"; # BIOS boot
            };
            ESP = {
              size = "512M";
              type = "EF00";
              content = {
                type = "filesystem";
                format = "vfat";
                mountpoint = "/boot";
              };
            };
            root = {
              size = "100%";
              content = {
                type = "filesystem";
                format = "ext4";
                mountpoint = "/";
              };
            };
          };
        };
      };
    };
  };
  networking = {
    hostName = "mars";
    useDHCP = true;
  };
  time.timeZone = "Europe/Istanbul";
  i18n.defaultLocale = "en_US.UTF-8";
  i18n.extraLocaleSettings = {
    LC_ADDRESS = "tr_TR.UTF-8";
    LC_IDENTIFICATION = "tr_TR.UTF-8";
    LC_MEASUREMENT = "tr_TR.UTF-8";
    LC_MONETARY = "tr_TR.UTF-8";
    LC_NAME = "tr_TR.UTF-8";
    LC_NUMERIC = "tr_TR.UTF-8";
    LC_PAPER = "tr_TR.UTF-8";
    LC_TELEPHONE = "tr_TR.UTF-8";
    LC_TIME = "tr_TR.UTF-8";
  };
  console.keyMap = "trq";
  programs.${user.shell}.enable = true;
  # Key-only SSH; allow remote nixos-rebuild --use-remote-sudo.
  ssh.enable = true;
  security.sudo.wheelNeedsPassword = false;
  netbird-server = {
    enable = true;
    domain = "netbird.yorganci.dev";
    acmeEmail = user.email;
  };
  netbird-proxy = {
    enable = true;
    domain = "yorganci.dev";
    tokenFile = "/var/lib/netbird-proxy/token";
  };
  # Join the mesh as a peer so Pi-hole is reachable on wt0.
  netbird = {
    enable = true;
    setupKeyFile = "/var/lib/netbird-client/setup.key";
  };
  pihole.enable = true;
}
