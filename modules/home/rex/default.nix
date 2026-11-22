{
  flake.modules = {
    # `rex.enable` is a Home Manager option, but GUI apps are installed
    # system-wide (Home Manager's `copyApps` is off, see
    # `modules/darwin/system.nix`). So install Rex.app into
    # `/Applications/Nix Apps` whenever any Home Manager user enables `rex`.
    darwin.rex = {
      config,
      lib,
      pkgs,
      ...
    }: let
      users = lib.attrValues (config.home-manager.users or {});
    in {
      config = lib.mkIf (lib.any (user: user.rex.enable or false) users) {
        environment.systemPackages = [pkgs.rex-app];
      };
    };
    homeManager.rex = {
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
          # Rex.app comes from Nix (`flake.overlays.rex-app`, installed by
          # `darwin.rex` above when this module is enabled); stop Sparkle from
          # updating it in place and drifting from the pinned build.
          SUEnableAutomaticChecks = false;
          SUAutomaticallyUpdate = false;
        };
      };
    };
  };
}
