{
  lib,
  config,
  user,
  ...
}: {
  options.ssh.enable = lib.mkEnableOption "SSH";
  config = lib.mkIf config.ssh.enable {
    # Enable Remote Login (SSH) on macOS
    services.openssh = {
      enable = true;
      extraConfig = ''
        # Disable root login
        PermitRootLogin no
        # Allow only public key login
        PasswordAuthentication no
        KbdInteractiveAuthentication no
        PubkeyAuthentication yes
        # Authentication config
        MaxAuthTries 3
        MaxSessions 3
        LoginGraceTime 20s
        # Only allows known user
        AllowUsers ${user.username}
        # Server-client alive checks
        ClientAliveInterval 300
        ClientAliveCountMax 3
        # File permission checking
        StrictModes yes
      '';
    };
    users.users.${user.username} = {
      openssh.authorizedKeys.keys = builtins.map (key: "${key} ${user.username}@${config.networking.hostName}") user.authorizedKeys;
    };
  };
}
