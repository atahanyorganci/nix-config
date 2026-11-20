{
  config,
  inputs,
  ...
}: let
  user = config.flake.me;
  mercuryHomeConfiguration = {user, ...}: {
    agents.enable = true;
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
    # Zed remote server, matching the Zed on sol and venus.
    zed.remoteServer.enable = true;
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
    # Diagnosing the freezes: they come with no log, under no load, on 6.12 and
    # 6.18 alike, as is known of N-series CPUs in deep idle states. C1E only
    # (of POLL C1E C6 C8 C10, sysfs states 0-4) until a month passes without
    # one; at the old rate of one every 6.5 days that is ~1% likely by chance.
    # Then try `intel_idle.states_off=24` (C8 and C10 off, C6 back). Not
    # `intel_idle.max_cstate=1`: on this CPU it registers no state but POLL, so
    # idle cores spin at full clock (74 C at idle). Watch the package
    # temperature: 66-70 C at idle before this.
    boot.kernelParams = ["intel_idle.states_off=28"];
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
    headless = true;
    hostInventory.role = "managedTarget";
    hostInventory.netbird.group = "Server";
    hostInventory.ssh.localHostName.enable = true;
    # Verified over the NetBird mesh and the LAN, and matching known_hosts, on
    # 2026-10-05.
    hostInventory.ssh.hostKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFy1R34T0MVD0LR0MxbCcNJphaG6KKjRSktwoPcgc/tW";
    # Recover from hangs and panics on its own. Every boot from 2026-01-30 to
    # 2026-11-20 but two ended without a shutdown: mostly silent freezes that
    # stayed down until power-cycled by hand (once for 61 days). systemd pings
    # the hardware watchdog (`intel_oc_wdt`, `/dev/watchdog0`; `iTCO_wdt` is the
    # other), which resets the board if the CPU stops; a kernel that panics or
    # finds a CPU locked up reboots itself. `hung_task_panic` stays off: slow
    # I/O (rclone, network mounts) trips it without anything being wrong.
    systemd.settings.Manager = {
      RuntimeWatchdogSec = "30s";
      RebootWatchdogSec = "10min";
    };
    boot.kernel.sysctl = {
      "kernel.panic" = 10;
      "kernel.panic_on_oops" = 1;
      "kernel.softlockup_panic" = 1;
      "kernel.hardlockup_panic" = 1;
    };
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
    # Self-hosted NetBird mesh
    netbird = {
      enable = true;
      setupKeyFile = "/var/lib/netbird-client/setup.key";
    };
    # rclone remotes; credentials from `rclone/*` in `hosts/mercury.yaml`.
    rclone.enable = true;
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
