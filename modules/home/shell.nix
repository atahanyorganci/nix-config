{
  flake.modules.homeManager.shell = {
    pkgs,
    lib,
    config,
    user,
    ...
  }: let
    cfg = config.shell;
    shellAliases = {
      # `ll` - list files with long format with `eza`
      ll = "${pkgs.eza}/bin/eza --long --header --icons always --git-ignore";
      # `tree` - list files in a tree format with `eza`
      tree = "${pkgs.eza}/bin/eza --tree --long --header --icons always --git-ignore";
      # `nd` - activate a development shell with default shell
      nd = "nix develop --command ${user.shell}";
    };
    fzfPreview = pkgs.writeShellApplication {
      name = "fzf-preview";
      runtimeInputs = [pkgs.eza pkgs.bat];
      text = ''
        if [ -d "$1" ]; then
          exec eza --icons always --git-ignore "$1"
        fi
        exec bat --color=always --style=numbers "$1"
      '';
    };
    fdFiles = "fd --hidden --follow --exclude .git";
  in {
    options = {
      shell = {
        bash.enable = lib.mkEnableOption "Bash";
        zsh.enable = lib.mkEnableOption "Z shell";
      };
    };
    config = {
      home.shellAliases = shellAliases;
      home.sessionVariables = rec {
        DEV_HOME = "${config.home.homeDirectory}/Developer";
        GITHUB_HOME = "${DEV_HOME}/GitHub";
      };
      programs.bash = lib.mkIf cfg.bash.enable {
        enable = true;
        enableCompletion = true;
      };
      programs.zsh = lib.mkIf cfg.zsh.enable {
        enable = true;
        enableCompletion = true;
        dotDir = "${config.xdg.configHome}/zsh";
        history = {
          path = "${config.xdg.dataHome}/zsh/history";
          share = true;
        };
      };
      # starship - The minimal, blazing-fast, and infinitely customizable prompt for any shell!
      # GitHub Repository: https://github.com/starship/starship
      programs.starship = {
        enable = true;
        enableBashIntegration = cfg.bash.enable;
        enableFishIntegration = cfg.fish.enable;
        enableNushellIntegration = cfg.nushell.enable;
        enableZshIntegration = cfg.zsh.enable;
        settings = {
          aws.disabled = true;
          gcloud.disabled = true;
        };
      };
      # fzf - A command-line fuzzy finder
      # GitHub Repository: https://github.com/junegunn/fzf
      programs.fzf = {
        enable = true;
        enableBashIntegration = cfg.bash.enable;
        enableZshIntegration = cfg.zsh.enable;
        enableFishIntegration = cfg.fish.enable;
        # Full screen with the prompt at the bottom; the widgets force `--reverse --height 40%`.
        defaultOptions = ["--layout=default" "--no-height"];
        fileWidget = {
          command = fdFiles;
          # `$dir` is the path typed before Ctrl-T; fd prefixes results with `./` if given `.`.
          fish.command = "${fdFiles} . (string match -v -- . $dir)";
          options = ["--preview 'fzf-preview {}'"];
        };
        # Empty commands stop fzf from binding Alt-C and Ctrl-R.
        changeDirWidget.command = "";
        historyWidget.command = "";
      };
      # fzf's fish integration always binds Shift-Tab to its completion picker.
      programs.fish.interactiveShellInit = lib.mkIf cfg.fish.enable (lib.mkOrder 201 ''
        bind --erase shift-tab
        bind --erase -M insert shift-tab
      '');
      # zoxide - A smarter cd command.
      # GitHub Repository: https://github.com/ajeetdsouza/zoxide
      programs.zoxide = {
        enable = true;
        enableBashIntegration = cfg.bash.enable;
        enableFishIntegration = cfg.fish.enable;
        enableNushellIntegration = cfg.nushell.enable;
        enableZshIntegration = cfg.zsh.enable;
      };
      # zoxide passes this to fzf in place of FZF_DEFAULT_OPTS; entries are `score<TAB>path`.
      home.sessionVariables._ZO_FZF_OPTS = lib.concatStringsSep " " [
        config.home.sessionVariables.FZF_DEFAULT_OPTS
        "--prompt='cd '"
        "--preview='fzf-preview {2..}'"
        "--bind=ctrl-z:ignore"
        "--tabstop=1"
        "--exit-0"
      ];
      # eza - A modern alternative to ls
      # GitHub Repository: https://github.com/eza-community/eza
      programs.eza = {
        enable = true;
        enableBashIntegration = cfg.bash.enable;
        enableFishIntegration = cfg.fish.enable;
        enableZshIntegration = cfg.zsh.enable;
      };
      # carapace - A multi-shell completion binary.
      # GitHub Repository: https://github.com/carapace-sh/carapace-bin
      programs.carapace = {
        enable = true;
        enableBashIntegration = cfg.bash.enable;
        enableFishIntegration = cfg.fish.enable;
        enableNushellIntegration = cfg.nushell.enable;
        enableZshIntegration = cfg.zsh.enable;
      };
      # atuin - Magical shell history
      # GitHub Repository: https://github.com/atuinsh/atuin
      programs.atuin = {
        enable = true;
        enableBashIntegration = cfg.bash.enable;
        enableFishIntegration = cfg.fish.enable;
        enableNushellIntegration = cfg.nushell.enable;
        enableZshIntegration = cfg.zsh.enable;
        flags = [
          "--disable-up-arrow"
          "--disable-ai"
        ];
        forceOverwriteSettings = true;
        settings = {
          sync_address = "https://atuin.yorganci.dev";
          auto_sync = true;
          sync_frequency = "5m";
          update_check = false;
          search_mode = "daemon-fuzzy";
          enter_accept = false;
          invert = true;
          show_help = false;
          # Not `programs.atuin.daemon`: its systemd socket mode is incompatible with autostart.
          daemon = {
            enabled = true;
            autostart = true;
            sync_frequency = 300;
            # The default lives under `$TMPDIR`, which `nix develop` changes: clients there miss the
            # daemon, try to autostart one, and block every command on its pidfile lock.
            socket_path = "${config.xdg.dataHome}/atuin/atuin.sock";
            # Atuin's default, set so the `onChange` hook below reads the same file.
            pidfile_path = "${config.xdg.dataHome}/atuin/atuin-daemon.pid";
          };
          logs.dir = "${config.xdg.stateHome}/atuin/logs";
        };
      };
      # An autostarted daemon keeps running across config changes. Atuin replaces one from another
      # release itself, but it asks the old daemon to stop over `socket_path`: once that moves, every
      # hook waits for the old daemon's pidfile lock until it times out (4s), twice per command.
      # Stop the daemon when the config changes; the next hook autostarts one with the new config.
      xdg.configFile."atuin/config.toml".onChange = lib.mkIf config.programs.atuin.enable ''
        atuinPidfile=${lib.escapeShellArg config.programs.atuin.settings.daemon.pidfile_path}
        if [[ -f $atuinPidfile ]]; then
          atuinPid=$(head -n 1 "$atuinPidfile")
          # The pidfile outlives the daemon, so check the PID still belongs to atuin.
          if [[ $atuinPid =~ ^[0-9]+$ ]] \
            && [[ $(${lib.getExe' pkgs.ps "ps"} -o comm= -p "$atuinPid") == *atuin ]]; then
            run kill "$atuinPid"
          fi
        fi
      '';
      programs.delta = {
        enable = true;
        enableGitIntegration = config.git.enable;
        options = {
          navigate = true;
        };
      };
      home.packages = with pkgs; [
        bat
        fd
        sd
        ripgrep
        jq
        fzfPreview
      ];
    };
  };
}
