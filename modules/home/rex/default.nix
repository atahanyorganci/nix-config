{
  flake.modules.homeManager.rex = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.rex;
    configDir = ./config;
  in {
    options.rex = {
      enable = lib.mkEnableOption "Rex terminal configuration";
    };
    config = lib.mkIf cfg.enable {
      xdg.configFile."rex" = {
        enable = true;
        recursive = true;
        source = configDir;
      };

      # Styling lives in the Mac app's settings, not in `init.lua`. These are
      # the keys Rex's Settings window writes, matched to Ghostty; Nix resets
      # them on every switch. The theme itself is imported once by hand
      # (Settings > Themes > Import Theme) and is not managed here.
      targets.darwin.defaults."com.superlogical.rex" = lib.mkIf pkgs.stdenv.hostPlatform.isDarwin {
        "Workspace.appearance" = "dark";
        "Workspace.interfaceStyle" = "useTheme";
        "Workspace.inactivePaneFadeMode" = "none";
        "Workspace.terminalFontName" = config.stylix.fonts.monospace.name;
        "Workspace.terminalFallbackFontNames" = [config.stylix.fonts.emoji.name];
        "Workspace.terminalFontPointSize" = config.terminal.font.size * 1.0;
        "Workspace.terminalFontStyle" = config.terminal.font.style;
        "Workspace.terminalPaddingX" = config.terminal.padding.x * 1.0;
        "Workspace.terminalPaddingY" = config.terminal.padding.y * 1.0;
      };
    };
  };
}
