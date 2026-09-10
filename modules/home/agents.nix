{
  flake.modules.homeManager.agents = {
    lib,
    config,
    pkgs,
    inputs,
    ...
  }: let
    system = pkgs.stdenv.hostPlatform.system;
    darwinPackages =
      if pkgs.stdenv.isDarwin
      then [
        inputs.nix-casks.packages.${system}.codex-app
      ]
      else [];

    # T3 Code has no Stylix target upstream. Its environments (not its
    # clients) own a proper theme: a JSON file in `~/.t3/userdata/themes/`
    # with one CSS colour per named UI role, whose filename (sans
    # extension) becomes its id. Build one from the active base16 scheme
    # and select it via `settings.json`'s `defaultTheme`.
    inherit (config.lib.stylix) colors;
    t3codeThemeId = "stylix";
    t3codeTheme = {
      version = 1;
      name = "Stylix (${colors."scheme-name"})";
      appearance = colors.variant;
      colors = with colors.withHashtag; {
        canvas = base00;
        chrome = base00;
        toolbar = base01;
        toolbarForeground = base05;
        toolbarBorder = base02;
        toolbarControl = base02;
        toolbarControlForeground = base05;
        toolbarControlHover = base03;
        surface = base01;
        surfaceRaised = base02;
        surfaceOverlay = base00;
        text = base05;
        textMuted = base04;
        border = base02;
        input = base01;
        focus = base0D;
        accent = base0D;
        accentForeground = base00;
        secondary = base02;
        secondaryForeground = base05;
        muted = base02;
        mutedForeground = base04;
        placeholder = base03;
        secondaryLabel = base04;
        iconMuted = base04;
        error = base08;
        errorForeground = base00;
        errorSurface = base02;
        warning = base0A;
        warningForeground = base00;
        warningSurface = base02;
        update = base0B;
        updateForeground = base00;
        updateSurface = base02;
        accentSurface = base02;
        accentSurfaceForeground = base05;
        messageSurface = base01;
        messageForeground = base05;
        messageAction = base0D;
        messageActionForeground = base00;
        messageActionHover = base0E;
        codeBackground = base00;
        codeForeground = base05;
        sidebar = base00;
        sidebarForeground = base05;
        sidebarMutedForeground = base04;
        sidebarControlSurface = base01;
        sidebarRowHover = base01;
        sidebarRowActive = base02;
        sidebarRowSelected = base02;
        sidebarBorder = base02;
        terminalBackground = base00;
        terminalForeground = base05;
        terminalCursor = base05;
        terminalSelection = base02;
        terminalScrollbar = base02;
        terminalScrollbarHover = base03;
      };
    };
  in {
    options.agents.enable = lib.mkEnableOption "Agent harnesses";
    config = lib.mkIf config.agents.enable {
      home.packages = darwinPackages ++ [pkgs.cursor-cli pkgs."9router"];
      # The theme file itself isn't part of `programs.t3code`'s schema: it's
      # read straight off disk by the server, not merged into
      # `client-settings.json`/`settings.json`, so it's declared as a plain
      # (immutable) home file instead.
      home.file.".t3/userdata/themes/${t3codeThemeId}.json".source =
        (pkgs.formats.json {}).generate "t3code-theme-${t3codeThemeId}" t3codeTheme;
      programs = {
        codex.enable = true;
        opencode.enable = true;
        claude-code.enable = true;
        pi-coding-agent.enable = true;
        t3code = {
          enable = true;
          package =
            if pkgs.stdenv.isDarwin
            then inputs.nix-casks.packages.${system}.t3-code
            else pkgs.t3code;
          # Fonts and light/dark polarity are client-local settings, unlike
          # the theme file above. Wire those up to the shared Stylix config
          # by hand too, since there's no Stylix target for either.
          clientSettings = {
            fontFamilySans = config.stylix.fonts.sansSerif.name;
            fontFamilyCode = config.stylix.fonts.monospace.name;
            fontFamilyTerminal = config.stylix.fonts.monospace.name;
            browserDefaultAppearance =
              if config.stylix.polarity == "either"
              then "system"
              else config.stylix.polarity;
          };
          userSettings = {
            # Select the theme generated above.
            defaultTheme = t3codeThemeId;
            # Give each agent harness a distinct accent colour from the
            # active Stylix palette instead of T3 Code's own defaults.
            providerInstances = {
              cursor.accentColor = colors.withHashtag.base0D;
              claudeAgent.accentColor = colors.withHashtag.base09;
            };
          };
        };
      };
    };
  };
}
