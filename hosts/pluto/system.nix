{user, ...}: {
  hostInventory.role = "managedTarget";
  hostInventory.netbird.group = "Servers";
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
            swap = {
              size = "8G";
              content = {
                type = "swap";
                discardPolicy = "both";
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
    hostName = "pluto";
    useDHCP = true;
  };
  time.timeZone = "Europe/Istanbul";
  programs.${user.shell}.enable = true;
  # Console has no password; auto-login for provider VNC/serial access.
  services.getty.autologinUser = user.username;
  # Key-only SSH; allow remote nixos-rebuild --elevate=sudo.
  ssh.enable = true;
  systemd.services.sshd.serviceConfig.LimitNOFILE = 524288;
  security.sudo.wheelNeedsPassword = false;
}
