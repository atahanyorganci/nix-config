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
        historyWidget.options = ["--prompt='History> '"];
      };
      # zoxide - A smarter cd command.
      # GitHub Repository: https://github.com/ajeetdsouza/zoxide
      programs.zoxide = {
        enable = true;
        enableBashIntegration = cfg.bash.enable;
        enableFishIntegration = cfg.fish.enable;
        enableNushellIntegration = cfg.nushell.enable;
        enableZshIntegration = cfg.zsh.enable;
      };
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
          "--disable-ctrl-r"
        ];
        forceOverwriteSettings = true;
        settings = {
          sync_address = "https://atuin.yorganci.dev";
        };
      };
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
      ];
    };
  };
}
