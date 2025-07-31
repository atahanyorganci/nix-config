{ flake
, pkgs
, lib
, config
, ...
}:
let
  inherit (flake) inputs;
  isDarwin = lib.strings.hasSuffix "darwin" pkgs.system;
  isLinux = lib.strings.hasSuffix "linux" pkgs.system;
  caskName = "ghostty";
  pkg =
    if isDarwin
    then inputs.nix-casks.packages.${pkgs.system}.${caskName}
    else pkgs.ghostty;
in
{
  options.ghostty.enable = lib.mkEnableOption "Visual Studio Code";
  config = lib.mkIf config.ghostty.enable {
    home = {
      packages = [ pkg ];
      sessionVariables.EDITOR = "code --wait";
    };
    programs.ghostty = {
      enable = true;
      package = pkg;
      enableBashIntegration = config.shell.bash.enable;
      enableZshIntegration = config.shell.zsh.enable;
      enableFishIntegration = config.shell.fish.enable;
      settings = {
        "window-width" = config.terminal.dimensions.columns;
        "window-height" = config.terminal.dimensions.lines;
        "window-padding-x" = config.terminal.padding.x;
        "window-padding-y" = config.terminal.padding.y;
        "window-position-x" = config.terminal.position.x;
        "window-position-y" = config.terminal.position.y;
        "font-style" = config.terminal.font.style;
        keybind = [
          "global:shift+alt+r=reload_config"
        ];
      };
    };
  };
}
