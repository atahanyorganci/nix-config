{
  flake.modules.nixos.aws = {
    lib,
    config,
    ...
  }: let
    cfg = config.aws;
  in {
    options.aws = {
      enable = lib.mkEnableOption "AWS EC2 VM configuration";
      disk = lib.mkOption {
        type = lib.types.str;
        default = "/dev/nvme0n1";
        description = "Block device for the root disk layout.";
      };
      swapSize = lib.mkOption {
        type = lib.types.str;
        default = "4G";
        description = "Swap partition size for the disko layout.";
      };
    };
    config = lib.mkIf cfg.enable {
      # Nitro (Graviton and current x86): NVMe root plus ENA networking.
      boot.initrd.availableKernelModules = [
        "nvme"
        "xen-blkfront"
        "xen-netfront"
        "ena"
        "virtio_pci"
        "virtio_scsi"
        "virtio_blk"
        "virtio_net"
        "ahci"
        "xhci_pci"
        "sd_mod"
      ];
      boot.initrd.kernelModules = ["nvme"];
      boot.kernelModules = [];
      boot.extraModulePackages = [];
      boot.kernelParams = ["console=ttyS0,115200n8" "console=tty0"];
      nixpkgs.hostPlatform = "aarch64-linux";
      hardware.enableRedistributableFirmware = true;
      # Graviton (and current x86 AMIs) boot UEFI; no BIOS/EF02 partition.
      boot.loader.efi.canTouchEfiVariables = false;
      boot.loader.grub = {
        enable = true;
        device = "nodev";
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
    };
  };
}
