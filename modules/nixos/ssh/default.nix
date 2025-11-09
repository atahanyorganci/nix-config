{ lib
, config
, user
, ...
}:
{
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
        AllowUsers = [ user.username ];
        # Disable additional features
        AllowAgentForwarding = false;
        AllowTcpForwarding = "no";
        X11Forwarding = false;
        PermitTunnel = "no";
        # Server-client alive checks
        ClientAliveInterval = 300;
        ClientAliveCountMax = 3;
        # Maximum verbosity
        LogLevel = "VERBOSE";
      };
    };
  };
}
