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

    # Local extra socket forwarded to remotes (gpg-agent enableExtraSocket).
    # Agent holders are Darwin today; GnuPG keeps sockets under ~/.gnupg there.
    localExtraSocket = "${config.home.homeDirectory}/.gnupg/S.gpg-agent.extra";

    remoteAgentSocket = target:
      if target.ssh.isDarwin
      then "/Users/${target.ssh.user}/.gnupg/S.gpg-agent"
      else "/run/user/${toString target.ssh.uid}/gnupg/S.gpg-agent";

    matchBlocksFromInventory =
      lib.mapAttrs (_name: target: {
        host = lib.concatStringsSep " " target.ssh.hostNames;
        user = target.ssh.user;
        forwardAgent = true;
        remoteForwards = [
          {
            bind.address = remoteAgentSocket target;
            host.address = localExtraSocket;
          }
        ];
      })
      config.gpg.managedTargets;
  in {
    options.gpg = {
      enable = lib.mkEnableOption "GPG";
      agent.enable = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Run a local gpg-agent (disable on remotes that use agent forwarding)";
      };
      managedTargets = lib.mkOption {
        type = lib.types.attrsOf lib.types.raw;
        default = {};
        description = "Flake inventory managedTargets used to generate SSH Host blocks (agent holders only)";
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
        matchBlocks = lib.mkIf config.gpg.agent.enable matchBlocksFromInventory;
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
