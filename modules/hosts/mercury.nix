{
  config,
  inputs,
  ...
}: let
  user = config.flake.me;
  mercuryHomeConfiguration = {user, ...}: {
    home = {
      username = user.username;
      homeDirectory = "/home/${user.username}";
    };
    # Public keys + gpg CLI; no local agent (use forwarded YubiKey from sol).
    gpg.enable = true;
    gpg.agent.enable = false;
    ffmpeg.enable = true;
    git = {
      enable = true;
      aliases.enable = true;
      user = {
        inherit (user) name email key;
      };
    };
    gum.enable = true;
    python.enable = true;
    shell = {
      bash.enable = true;
      zsh.enable = true;
      fish.enable = true;
    };
    tools.enable = true;
    uutils.enable = true;
    node.enable = true;
    wget.enable = true;
  };
  mercuryHardwareModule = {
    config,
    lib,
    modulesPath,
    ...
  }: {
    imports = [
      (modulesPath + "/installer/scan/not-detected.nix")
    ];
    boot.initrd.availableKernelModules = ["xhci_pci" "ahci" "usbhid" "usb_storage" "sd_mod" "sdhci_pci"];
    boot.initrd.kernelModules = [];
    boot.kernelModules = ["kvm-intel"];
    boot.extraModulePackages = [];
    fileSystems."/" = {
      device = "/dev/disk/by-uuid/021f08b1-a877-4169-b6db-2a55833c1694";
      fsType = "ext4";
    };
    fileSystems."/boot" = {
      device = "/dev/disk/by-uuid/6E88-B561";
      fsType = "vfat";
      options = ["fmask=0077" "dmask=0077"];
    };
    swapDevices = [];
    nixpkgs.hostPlatform = lib.mkDefault "x86_64-linux";
    hardware.cpu.intel.updateMicrocode = lib.mkDefault config.hardware.enableRedistributableFirmware;
  };
  mercuryNixosModule = {user, ...}: {
    hostInventory.role = "managedTarget";
    hostInventory.netbird.group = "Servers";
    hostInventory.ssh.localHostName.enable = true;
    # Bootloader.
    boot.loader.systemd-boot.enable = true;
    boot.loader.efi.canTouchEfiVariables = true;
    # Networking
    networking = {
      hostName = "mercury";
      networkmanager.enable = true;
    };
    # Enable mDNS (mercury.local hostname resolution)
    mdns.enable = true;
    # Time Zone
    time.timeZone = "Europe/Istanbul";
    # Internationalization
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
    # Configure keymap in X11
    services.xserver.xkb = {
      layout = "tr";
      variant = "";
    };
    # Configure console keymap
    console.keyMap = "trq";
    # Add default user to `networkmanager` group
    users.users.${user.username}.extraGroups = ["networkmanager"];
    # Enable automatic login for the user.
    services.getty.autologinUser = user.username;
    # Enable Docker runtime
    docker.enable = true;
    # Enable SSH server
    ssh.enable = true;
    # Allow sudo authentication using a forwarded SSH agent. The trusted key is
    # the user's declarative SSH authorized key; password authentication remains
    # available as a fallback.
    security.pam = {
      rssh.enable = true;
      services.sudo.rssh = true;
    };
    # Enable VSCode Server
    services.vscode-server.enable = true;
    # Self-hosted NetBird mesh
    netbird = {
      enable = true;
      setupKeyFile = "/var/lib/netbird-client/setup.key";
    };
    # Home Assistant: NetBird for mesh peers, Pangolin for public HTTPS.
    home-assistant = {
      enable = true;
      externalUrl = "https://home-assistant.yorganci.dev";
      internalUrl = "http://mercury.netbird.selfhosted:8123";
    };
  };
in {
  flake = {
    nixosConfigurations.mercury = inputs.nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        mercuryNixosModule
        mercuryHardwareModule
        {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.verbose = true;
          home-manager.users.${user.username} = {...}: {
            imports = [
              config.flake.modules.homeManager.default
              mercuryHomeConfiguration
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
