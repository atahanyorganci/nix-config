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

      # `rex.settings` (generated, see ./generated/settings-options.nix) mirrors
      # the keys under `Workspace.`, nesting on dots. Null means "not set":
      # drop it so Rex applies its own default instead of a pinned one.
      toDefaults = prefix: attrs:
        lib.concatMapAttrs (
          name: value:
            if value == null
            then {}
            else if lib.isAttrs value
            then toDefaults "${prefix}${name}." value
            else {"${prefix}${name}" = value;}
        )
        attrs;
    in {
      options.rex = {
        enable = lib.mkEnableOption "Rex terminal configuration";
        extraSettings = lib.mkOption {
          type = lib.types.attrsOf lib.types.anything;
          default = {};
          example = {"Workspace.sshAgentChoice" = "system";};
          description = ''
            Raw entries for the `com.superlogical.rex` defaults domain, keyed
            by the full preference name. Layered over `rex.settings`, for keys
            the generator does not expose.
          '';
        };
      };
      config = lib.mkIf cfg.enable {
        xdg.configFile."rex" = {
          enable = true;
          recursive = true;
          source = configDir;
        };

        # Styling lives in the Mac app's settings, not in `init.lua`. Matched to
        # Ghostty; Nix resets them on every switch. The theme itself is imported
        # once by hand (Settings > Themes > Import Theme) and is not managed here.
        rex.settings = lib.mapAttrs (_: lib.mkDefault) {
          appearance = "dark";
          interfaceStyle = "useTheme";
          inactivePaneFadeMode = "none";
          usesStandardInactiveWindowPaneStyles = false;
          terminalFontName = config.stylix.fonts.monospace.name;
          terminalFallbackFontNames = [config.stylix.fonts.emoji.name];
          terminalFontPointSize = config.terminal.font.size;
          terminalFontStyle = config.terminal.font.style;
          terminalPaddingX = config.terminal.padding.x;
          terminalPaddingY = config.terminal.padding.y;
        };

        targets.darwin.defaults."com.superlogical.rex" = lib.mkIf pkgs.stdenv.hostPlatform.isDarwin (
          toDefaults "Workspace." cfg.settings
          // cfg.extraSettings
          // {
            # Rex.app comes from Nix (`flake.overlays.rex-app`, installed by
            # `darwin.rex` above when this module is enabled); stop Sparkle from
            # updating it in place and drifting from the pinned build.
            SUEnableAutomaticChecks = false;
            SUAutomaticallyUpdate = false;
          }
        );
      };
    };
  };
}
