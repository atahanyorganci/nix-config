{
  flake.modules.nixos.hetzner = {
    lib,
    config,
    user,
    ...
  }: let
    cfg = config.hetzner;
  in {
    options.hetzner = {
      enable = lib.mkEnableOption "Hetzner Cloud VM configuration";
      consoleAutologin = lib.mkEnableOption "Auto-login on console for Hetzner VNC/serial access";
      disk = lib.mkOption {
        type = lib.types.str;
        default = "/dev/sda";
        description = "Block device for the root disk layout.";
      };
      swapSize = lib.mkOption {
        type = lib.types.str;
        default = "8G";
        description = "Swap partition size for the disko layout.";
      };
    };
    config = lib.mkIf cfg.enable {
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
        devices = [cfg.disk];
        efiSupport = true;
        efiInstallAsRemovable = true;
      };
      disko.devices = {
        disk = {
          main = {
            type = "disk";
            device = cfg.disk;
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
                  size = cfg.swapSize;
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
      networking.useDHCP = true;
      services.getty.autologinUser = lib.mkIf cfg.consoleAutologin user.username;
    };
  };
}
