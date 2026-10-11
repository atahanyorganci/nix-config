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

    # `programs.ssh.settings` takes OpenSSH directive names and treats each
    # attribute name as a `Host` pattern. `header` is set explicitly so the
    # block still matches every hostname while the attribute name stays the
    # short inventory name (which is what `lib.hm.dag` ordering would refer
    # to).
    #
    # The GPG forward binds one fixed path on the remote, and sshd
    # (StreamLocalBindUnlink) hands it to the newest connection: when that
    # connection closes, signing breaks for every session on the host. So all
    # sessions to a host share one persistent connection, and with it one
    # forward. The ControlPath is keyed on the inventory name rather than %C so
    # that every alias of a host (`mercury`, `mercury.local`, ...) reuses the
    # same connection. Tools that open their own connections (nixos-deploy,
    # Zed) pass ClearAllForwardings so they never take the path over.
    settingsFromInventory =
      lib.mapAttrs (name: target: {
        header = "Host ${lib.concatStringsSep " " target.ssh.hostNames}";
        User = target.ssh.user;
        ForwardAgent = true;
        RemoteForward = [
          {
            bind.address = remoteAgentSocket target;
            host.address = localExtraSocket;
          }
        ];
        ControlMaster = "auto";
        ControlPath = "~/.ssh/cm-${name}";
        ControlPersist = true;
        # Let a connection that died with the network (sleep, roaming) exit
        # within ~45s instead of hanging every session multiplexed onto it.
        ServerAliveInterval = 15;
        ServerAliveCountMax = 3;
      })
      config.gpg.managedTargets;

    # On hosts that receive a forwarded agent: sshd gives each connection its
    # own SSH_AUTH_SOCK, which dies with that connection, so long-lived
    # processes (tmux) keep a dead path. Shells instead use a stable symlink,
    # pointed at the forwarded socket of a live connection.
    stableAuthSock = "${config.home.homeDirectory}/.ssh/agent.sock";
    linkAuthSock = pkgs.writeShellScript "link-forwarded-ssh-agent" ''
      # Usage: link-forwarded-ssh-agent <forwarded SSH_AUTH_SOCK>
      # Points ${stableAuthSock} at the given socket unless it already points
      # at a live agent, so short-lived connections (deploys) never take it
      # from a long-lived one. Prints nothing.
      sock=$1
      stable=${lib.escapeShellArg stableAuthSock}
      [ -S "$sock" ] || exit 0
      [ "$(${pkgs.coreutils}/bin/readlink "$stable")" = "$sock" ] && exit 0
      # ssh-add exits 0 or 1 when it reached an agent, 2 when it could not;
      # timeout (124) covers a forward whose client vanished unnoticed.
      status=0
      SSH_AUTH_SOCK=$stable ${pkgs.coreutils}/bin/timeout 2 \
        ${pkgs.openssh}/bin/ssh-add -l >/dev/null 2>&1 || status=$?
      [ "$status" -le 1 ] && exit 0
      ${pkgs.coreutils}/bin/ln -sfn "$sock" "$stable.$$" &&
        ${pkgs.coreutils}/bin/mv -Tf "$stable.$$" "$stable"
    '';
    # bash and zsh share the snippet; the guard makes repeated runs (nested
    # shells, .bash_profile sourcing .bashrc) no-ops.
    stableAuthSockSh = ''
      if [ -n "$SSH_CONNECTION" ] && [ -n "$SSH_AUTH_SOCK" ] && [ "$SSH_AUTH_SOCK" != ${lib.escapeShellArg stableAuthSock} ]; then
        ${linkAuthSock} "$SSH_AUTH_SOCK"
        export SSH_AUTH_SOCK=${lib.escapeShellArg stableAuthSock}
      fi
    '';
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
        settings = lib.mkIf config.gpg.agent.enable settingsFromInventory;
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
      # Stable SSH_AUTH_SOCK for the forwarded agent (see `linkAuthSock`). Set
      # early and for non-interactive shells too: sshd runs every session,
      # including `ssh host cmd` and sudo via pam_rssh, through the login shell.
      programs.bash.bashrcExtra = lib.mkIf (!config.gpg.agent.enable) (lib.mkBefore stableAuthSockSh);
      programs.bash.profileExtra = lib.mkIf (!config.gpg.agent.enable) (lib.mkBefore stableAuthSockSh);
      programs.zsh.envExtra = lib.mkIf (!config.gpg.agent.enable) (lib.mkBefore stableAuthSockSh);
      programs.fish.shellInit = lib.mkIf (!config.gpg.agent.enable) (lib.mkBefore ''
        if set -q SSH_CONNECTION; and set -q SSH_AUTH_SOCK; and test "$SSH_AUTH_SOCK" != ${lib.escapeShellArg stableAuthSock}
          ${linkAuthSock} "$SSH_AUTH_SOCK"
          set -gx SSH_AUTH_SOCK ${lib.escapeShellArg stableAuthSock}
        end
      '');
      # SSH_AUTH_SOCK is set via HM sshAuthSock (from enableSshSupport), which
      # preserves a forwarded agent when SSH_CONNECTION is set.
      services.gpg-agent = lib.mkIf config.gpg.agent.enable {
        enable = true;
        enableSshSupport = true;
        enableExtraSocket = true;
        enableBashIntegration = config.shell.bash.enable;
        enableFishIntegration = config.shell.fish.enable;
        enableNushellIntegration = config.shell.nushell.enable;
        enableZshIntegration = config.shell.zsh.enable;
      };
    };
  };
}
