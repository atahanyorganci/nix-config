{
  flake.modules.homeManager.nushell = {
    pkgs,
    lib,
    config,
    ...
  }: let
    # Create attribute set of files to linked into `.config/nushell/autoload/`
    nushellFiles =
      map
      (
        p: let
          baseName = builtins.baseNameOf p;
        in {
          name = ".config/nushell/autoload/${baseName}";
          value = {source = p;};
        }
      )
      config.programs.nushell.autoLoadFiles;
    homeFiles = builtins.listToAttrs nushellFiles;
    # Get `*.nu` files from library directory.
    nuLibEntries = builtins.readDir ./lib;
    nuLibEntryNames = builtins.attrNames nuLibEntries;
    nuLibFileNames = builtins.filter (name: lib.strings.hasSuffix ".nu" name) nuLibEntryNames;
    nuLibFiles = builtins.map (name: ./lib/${name}) nuLibFileNames;
  in {
    options = {
      shell.nushell.enable = lib.mkEnableOption "Nushell";
      programs.nushell.autoLoadFiles = lib.mkOption {
        type = lib.types.listOf lib.types.path;
        default = [];
        description = "List of Nushell files to be auto-loaded.";
        example = lib.literalExpression ''
          [
            ./plugins/nu_plugin_query.nu
            /plugins/nu/my_plugin.nu
          ]
        '';
      };
    };
    config = lib.mkIf config.shell.nushell.enable {
      home.file = homeFiles;
      programs.nushell = {
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
    };
  };
}
