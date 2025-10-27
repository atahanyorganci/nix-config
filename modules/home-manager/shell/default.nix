{ pkgs
, lib
, config
, user
, ...
}:
let
  cfg = config.shell;
  shellAliases = {
    # get OS name ex: "GNU/Linux", "Darwin"
    os = "uname -o";
    # `ll` - list files with long format with `eza`
    ll = "${pkgs.eza}/bin/eza --long --header --icons";
    # `tree` - list files in a tree format with `eza`
    tree = "${pkgs.eza}/bin/eza --tree --long --header --icons";
    # `nd` - activate a development shell with default shell
    nd = "nix develop --command ${user.shell}";
  };
in
{
  options.shell = {
    bash.enable = lib.mkEnableOption "Bash";
    fish.enable = lib.mkEnableOption "fish";
    nushell.enable = lib.mkEnableOption "Nushell";
    zsh.enable = lib.mkEnableOption "Z shell";
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
      history = {
        path = "${config.xdg.dataHome}/zsh/history";
        share = true;
      };
    };
    programs.fish = lib.mkIf cfg.fish.enable {
      enable = true;
      plugins = [
        {
          name = "autopair.fish";
          src = pkgs.fetchFromGitHub {
            owner = "jorgebucaran";
            repo = "autopair.fish";
            rev = "1.0.4";
            sha256 = "sha256-s1o188TlwpUQEN3X5MxUlD/2CFCpEkWu83U9O+wg3VU=";
          };
        }
        {
          name = "${user.username}-config";
          src = ../../../plugins/config;
        }
        {
          name = "${user.username}-tools";
          src = ../../../plugins/tools;
        }
      ];
    };
    programs.nushell = lib.mkIf cfg.fish.nushell {
      enable = true;
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
      historyWidgetOptions = [ "--prompt='History> '" ];
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
      enableNushellIntegration = cfg.nushell.enable;
      enableZshIntegration = cfg.zsh.enable;
    };
    home.packages = with pkgs; [
      bat
      delta
      fd
      sd
      ripgrep
      jq
    ];
  };
}
