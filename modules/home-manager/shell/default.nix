{ pkgs
, lib
, config
, user
, ...
}:
let
  cfg = config.shell;
  shellAliases = {
    # `ll` - list files with long format with `eza`
    ll = "${pkgs.eza}/bin/eza --long --header --icons";
    # `tree` - list files in a tree format with `eza`
    tree = "${pkgs.eza}/bin/eza --tree --long --header --icons";
    # `nd` - activate a development shell with default shell
    nd = "nix develop --command ${user.shell}";
  };
  # Create attribute set of files to linked into `.config/nushell/autoload/`
  nushellFiles = map
    (p:
      let
        baseName = builtins.baseNameOf p;
      in
      { name = ".config/nushell/autoload/${baseName}"; value = { source = p; }; }
    )
    config.programs.nushell.autoLoadFiles;
  homeFiles = builtins.listToAttrs nushellFiles;
  # Get `*.nu` files from library directory.
  nuLibEntries = builtins.readDir ../../../nu;
  nuLibEntryNames = builtins.attrNames nuLibEntries;
  nuLibFileNames = builtins.filter (name: lib.strings.hasSuffix ".nu" name) nuLibEntryNames;
  nuLibFiles = builtins.map (name: ../../../nu/${name}) nuLibFileNames;
in
{
  options = {
    shell = {
      bash.enable = lib.mkEnableOption "Bash";
      fish.enable = lib.mkEnableOption "fish";
      nushell.enable = lib.mkEnableOption "Nushell";
      zsh.enable = lib.mkEnableOption "Z shell";
    };
    programs.nushell.autoLoadFiles = lib.mkOption {
      type = lib.types.listOf lib.types.path;
      default = [ ];
      description = "List of Nushell files to be auto-loaded.";
      example = lib.literalExpression ''
        [
          ./plugins/nu_plugin_query.nu
          /plugins/nu/my_plugin.nu
        ]
      '';
    };
  };
  config = {
    home.shellAliases = shellAliases;
    home.sessionVariables = rec {
      DEV_HOME = "${config.home.homeDirectory}/Developer";
      GITHUB_HOME = "${DEV_HOME}/GitHub";
    };
    home.file = lib.mkIf cfg.nushell.enable homeFiles;
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
          src = ../../../fish/plugins/config;
        }
        {
          name = "${user.username}-tools";
          src = ../../../fish/plugins/tools;
        }
      ];
    };
    programs.nushell = lib.mkIf cfg.nushell.enable {
      enable = true;
      settings = {
        show_banner = false;
        buffer_editor = "code";
      };
      plugins = with pkgs.nushellPlugins; [
        skim
        polars
      ];
      autoLoadFiles = nuLibFiles;
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
    # atuin - ✨ Magical shell history
    # GitHub Repository: https://github.com/atuinsh/atuin
    programs.atuin = {
      enable = true;
      enableBashIntegration = cfg.bash.enable;
      enableFishIntegration = cfg.fish.enable;
      enableNushellIntegration = cfg.nushell.enable;
      enableZshIntegration = cfg.zsh.enable;
      settings = {
        sync_address = "http://localhost:8888";
      };
      flags = [
        "--disable-up-arrow"
        "--disable-ctrl-r"
      ];
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
      delta
      fd
      sd
      ripgrep
      jq
    ];
  };
}
