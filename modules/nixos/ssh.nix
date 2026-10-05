{
  flake.modules.nixos.ssh = {
    lib,
    config,
    user,
    ...
  }: {
    options.ssh.enable = lib.mkEnableOption "SSH";
    config = lib.mkIf config.ssh.enable {
      services.openssh = {
        enable = true;
        settings = {
          # Disable root login
          PermitRootLogin = "no";
          # Allow only public key login
          PasswordAuthentication = false;
          KbdInteractiveAuthentication = false;
          PubkeyAuthentication = true;
          # Authentication config
          MaxAuthTries = 3;
          MaxSessions = 3;
          LoginGraceTime = "20s";
          # Only allows known user
          AllowUsers = [user.username];
          # Disable X11 display server forwarding
          X11Forwarding = false;
          # Allow SSH agent and GPG socket forwarding
          AllowAgentForwarding = true;
          StreamLocalBindUnlink = "yes";
          # Server-client alive checks
          ClientAliveInterval = 300;
          ClientAliveCountMax = 3;
          # Maximum verbosity
          LogLevel = "VERBOSE";
        };
        ports = [22];
        # One identity per host: the ed25519 key pinned as
        # `hostInventory.ssh.hostKey`, which is also the key sops-nix decrypts
        # with. The default list adds an RSA key that nothing pins or checks.
        hostKeys = [
          {
            path = "/etc/ssh/ssh_host_ed25519_key";
            type = "ed25519";
          }
        ];
      };
      networking.firewall.allowedTCPPorts = [22];
    };
  };
}
