{
  config,
  inputs,
  ...
}: let
  user = config.flake.me;
  marsHomeConfiguration = {user, ...}: {
    home = {
      username = user.username;
      homeDirectory = "/home/${user.username}";
    };
    gpg.enable = true;
    gpg.agent.enable = false;
    git.user = {
      inherit (user) name email key;
    };
    shell = {
      bash.enable = true;
      zsh.enable = true;
      fish.enable = true;
    };
  };
  marsNixosModule = {
    user,
    config,
    ...
  }: rec {
    headless = true;
    hostInventory.role = "managedTarget";
    hostInventory.netbird.group = "Servers";
    # Verified over the public IP and the NetBird mesh on 2026-10-02.
    hostInventory.ssh.hostKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIC7mbXvWy/PXRldSlle2YRiJYuu8rQK36ai4m/4+nond";
    hetzner.enable = true;
    networking.hostName = "mars";
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
    systemd.services.sshd.serviceConfig.LimitNOFILE = 524288;
    security.sudo.wheelNeedsPassword = false;
    netbird-server = {
      enable = true;
      acmeEmail = user.email;
      enableAgentNetwork = true;
    };
    netbird-proxy = {
      enable = true;
      tokenFile = config.sops.secrets."netbird-proxy/token".path;
      private = true;
    };
    # hosts/mars.yaml in nix-secrets; connect-proxy.sh writes a new token there.
    sops.secrets."netbird-proxy/token" = {
      owner = "netbird-proxy";
      restartUnits = ["netbird-proxy.service"];
    };
    # Join the mesh as a peer so Pi-hole is reachable on wt0.
    netbird = {
      enable = true;
      setupKeyFile = "/var/lib/netbird-client/setup.key";
    };
    pihole = {
      enable = true;
      hostName = "${networking.hostName}.netbird.selfhosted";
    };
    searx.enable = true;
    atuin-server.enable = true;
    agent-gateway = {
      enable = true;
      # The reverse proxy dials mars's mesh address, so the listener has to exist
      # off loopback; the firewall keeps it off the public NIC.
      host = "0.0.0.0";
      interfaces = ["nb-wt0"];
      expose = {
        enable = true;
        key = "ai";
        accessGroups = ["Admin" "Servers"];
      };
      # A second entry point next to `ai`: the NetBird Agent Network endpoint,
      # whose proxy runs here and dials the gateway over loopback.
      agentNetwork.enable = true;
    };
    # Ships the gateway's traces and logs, and its journal, to Axiom; the
    # gateway exports to it (agent-gateway.telemetry follows this). Its token
    # and endpoint are in hosts/mars.yaml (`just connect-axiom mars`).
    otel-collector = {
      enable = true;
      journald.units = ["agent-gateway.service" "opentelemetry-collector.service"];
      httpcheck.targets = ["http://127.0.0.1:${toString config.agent-gateway.port}/v1/models"];
    };
  };
in {
  flake = {
    nixosConfigurations.mars = inputs.nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        marsNixosModule
        {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.verbose = true;
          home-manager.users.${user.username}.imports = [
            config.flake.modules.homeManager.default
            marsHomeConfiguration
          ];
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
