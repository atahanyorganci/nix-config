{user, ...}: {
  hostInventory.role = "managedTarget";
  # KVM virtio modules so root disk/network appear in the initrd.
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
  # BIOS + EFI removable GRUB; disko provides the EF02 partition.
  boot.loader.grub = {
    enable = true;
    devices = ["/dev/sda"];
    efiSupport = true;
    efiInstallAsRemovable = true;
  };
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
  # Provider assigns a static address via cloud-init (no DHCP).
  # Keep classical eth0 naming to match the Proxmox/QEMU NIC.
  networking = {
    hostName = "jupiter";
    usePredictableInterfaceNames = false;
    useDHCP = false;
    interfaces.eth0.ipv4.addresses = [
      {
        address = "94.249.230.15";
        prefixLength = 24;
      }
    ];
    defaultGateway = "94.249.230.1";
    nameservers = [
      "1.1.1.1"
      "8.8.8.8"
    ];
  };
  time.timeZone = "Europe/Istanbul";
  programs.${user.shell}.enable = true;
  # Console has no password; auto-login for provider VNC/serial access.
  services.getty.autologinUser = user.username;
  # Key-only SSH; allow remote nixos-rebuild --elevate=sudo.
  ssh.enable = true;
  security.sudo.wheelNeedsPassword = false;
}
