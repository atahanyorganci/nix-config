{
  flake.modules.homeManager.gpg = {
    pkgs,
    config,
    lib,
    ...
  }: let
    isDarwin = pkgs.stdenv.hostPlatform.isDarwin;
    includes =
      if isDarwin
      then ["~/.orbstack/ssh/config"]
      else [];
    keyDirContents = builtins.readDir ./keys;
    keyFileNames = builtins.attrNames keyDirContents;
    publicKeys =
      builtins.map (key: {
        source = ./keys/${key};
        trust = 5;
      })
      keyFileNames;
  in {
    options.gpg = {
      enable = lib.mkEnableOption "GPG";
      agent.enable = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Run a local gpg-agent (disable on remotes that use agent forwarding)";
      };
    };
    config = lib.mkIf config.gpg.enable {
      programs.gpg = {
        enable = true;
        mutableTrust = false;
        inherit publicKeys;
        # Keep a local agent from stealing a forwarded socket (wiki.gnupg.org/AgentForwarding).
        settings = lib.mkIf (!config.gpg.agent.enable) {
          no-autostart = true;
        };
      };
      programs.ssh = {
        enable = true;
        enableDefaultConfig = false;
        inherit includes;
      };
      home.packages = with pkgs; [
        openssl
        yubikey-personalization
        yubikey-manager
      ];
      # Ensure /run/user/$UID/gnupg exists so sshd can bind the forwarded socket.
      home.activation.gpgCreateSocketDir = lib.mkIf (!config.gpg.agent.enable) (
        lib.hm.dag.entryAfter ["writeBoundary"] ''
          ${lib.getExe' pkgs.gnupg "gpgconf"} --create-socketdir || true
        ''
      );
      # SSH_AUTH_SOCK is set via HM sshAuthSock (from enableSshSupport), which
      # preserves a forwarded agent when SSH_CONNECTION is set.
      services.gpg-agent = lib.mkIf config.gpg.agent.enable {
        enable = true;
        enableSshSupport = true;
        enableExtraSocket = true;
        enableBashIntegration = config.shell.bash.enable;
        enableFishIntegration = config.shell.fish.enable;
        enableNushellIntegration = config.shell.fish.enable;
        enableZshIntegration = config.shell.zsh.enable;
      };
    };
  };
}
