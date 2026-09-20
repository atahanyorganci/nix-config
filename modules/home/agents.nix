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

    # Every model behind the local gateway is reached over one
    # OpenAI-compatible endpoint, so the per-model entries differ only in a
    # handful of fields. Describe them as data and build the provider from
    # that rather than repeating the same shape for every model.
    gatewayPort = 3000;

    mkModel = {
      id,
      name,
      contextWindow,
      maxTokens,
      cost ? null,
      reasoning ? true,
      image ? true,
      compat ? null,
    }:
      {
        inherit id name reasoning contextWindow maxTokens;
        input = ["text"] ++ lib.optional image "image";
      }
      // lib.optionalAttrs (cost != null) {inherit cost;}
      // lib.optionalAttrs (compat != null) {inherit compat;};

    # Prices are USD per million tokens. Either one attrset of flat rates, or
    # a list whose first entry is the base rates and whose later entries each
    # add `inputTokensAbove`, the prompt size at which those rates take over.
    #
    # The guard matters: an entry missing `inputTokensAbove` would otherwise
    # land in `tiers` as an unbounded tier and quietly misprice the model.
    mkCost = spec:
      if !lib.isList spec
      then spec
      else let
        base = lib.head spec;
        tiers = lib.tail spec;
        untiered = lib.filter (tier: !(tier ? inputTokensAbove)) tiers;
      in
        lib.throwIf (untiered != [])
        "mkCost: every cost entry after the first needs inputTokensAbove"
        (base // lib.optionalAttrs (tiers != []) {inherit tiers;});

    gatewayModels = map mkModel [
      {
        id = "gpt-5.6-terra";
        name = "GPT-5.6-Terra";
        contextWindow = 1050000;
        maxTokens = 128000;
        cost = mkCost [
          {
            input = 2;
            output = 12;
            cacheRead = 0.2;
            cacheWrite = 2.5;
          }
          {
            inputTokensAbove = 272000;
            input = 4;
            output = 18;
            cacheRead = 0.4;
            cacheWrite = 5;
          }
        ];
      }
      {
        id = "gpt-5.6-luna";
        name = "GPT-5.6-Luna";
        contextWindow = 1050000;
        maxTokens = 128000;
        cost = mkCost [
          {
            input = 0.2;
            output = 1.2;
            cacheRead = 0.02;
            cacheWrite = 0.25;
          }
          {
            inputTokensAbove = 272000;
            input = 0.4;
            output = 1.8;
            cacheRead = 0.04;
            cacheWrite = 0.5;
          }
        ];
      }
      {
        id = "gpt-5.6-sol";
        name = "GPT-5.6-Sol";
        contextWindow = 1050000;
        maxTokens = 128000;
        cost = mkCost [
          {
            input = 5;
            output = 30;
            cacheRead = 0.5;
            cacheWrite = 6.25;
          }
          {
            inputTokensAbove = 272000;
            input = 10;
            output = 45;
            cacheRead = 1;
            cacheWrite = 12.5;
          }
        ];
      }
      {
        id = "gpt-6-astra";
        name = "GPT-6-Astra";
        contextWindow = 1050000;
        maxTokens = 128000;
        cost = mkCost [
          {
            input = 10;
            output = 50;
            cacheRead = 1;
            cacheWrite = 12.5;
          }
          {
            inputTokensAbove = 272000;
            input = 20;
            output = 75;
            cacheRead = 2;
            cacheWrite = 25;
          }
        ];
      }
      {
        id = "claude-fable-5-1";
        name = "Claude Fable 5.1";
        contextWindow = 1000000;
        maxTokens = 128000;
        cost = mkCost {
          input = 10;
          output = 50;
          cacheRead = 0.25;
          cacheWrite = 12.5;
        };
      }
      {
        id = "claude-opus-5";
        name = "Claude Opus 5";
        contextWindow = 1000000;
        maxTokens = 128000;
        cost = mkCost {
          input = 5;
          output = 25;
          cacheRead = 0.5;
          cacheWrite = 6.25;
        };
      }
      {
        id = "claude-sonnet-5";
        name = "Claude Sonnet 5";
        contextWindow = 1000000;
        maxTokens = 128000;
        cost = mkCost {
          input = 3;
          output = 15;
          cacheRead = 0.3;
          cacheWrite = 3.75;
        };
      }
      {
        id = "claude-fable-5";
        name = "Claude Fable 5";
        contextWindow = 1000000;
        maxTokens = 128000;
        cost = mkCost {
          input = 10;
          output = 50;
          cacheRead = 1;
          cacheWrite = 12.5;
        };
      }
      {
        id = "claude-opus-4-8";
        name = "Claude Opus 4.8";
        contextWindow = 1000000;
        maxTokens = 128000;
        cost = mkCost {
          input = 5;
          output = 25;
          cacheRead = 0.5;
          cacheWrite = 6.25;
        };
      }
      {
        id = "claude-opus-4-7";
        name = "Claude Opus 4.7";
        contextWindow = 1000000;
        maxTokens = 128000;
        cost = mkCost {
          input = 5;
          output = 25;
          cacheRead = 0.5;
          cacheWrite = 6.25;
        };
      }
      {
        id = "claude-sonnet-4-6";
        name = "Claude Sonnet 4.6";
        contextWindow = 1000000;
        maxTokens = 128000;
        cost = mkCost {
          input = 3;
          output = 15;
          cacheRead = 0.3;
          cacheWrite = 3.75;
        };
      }
      {
        id = "claude-opus-4-6";
        name = "Claude Opus 4.6";
        contextWindow = 1000000;
        maxTokens = 128000;
        cost = mkCost {
          input = 5;
          output = 25;
          cacheRead = 0.5;
          cacheWrite = 6.25;
        };
      }
      {
        id = "claude-opus-4-5-20251101";
        name = "Claude Opus 4.5";
        contextWindow = 200000;
        maxTokens = 64000;
        cost = mkCost {
          input = 5;
          output = 25;
          cacheRead = 0.5;
          cacheWrite = 6.25;
        };
      }
      {
        id = "claude-haiku-4-5-20251001";
        name = "Claude Haiku 4.5";
        contextWindow = 200000;
        maxTokens = 64000;
        cost = mkCost {
          input = 1;
          output = 5;
          cacheRead = 0.1;
          cacheWrite = 1.25;
        };
      }
      {
        id = "claude-sonnet-4-5-20250929";
        name = "Claude Sonnet 4.5";
        contextWindow = 200000;
        maxTokens = 64000;
        cost = mkCost {
          input = 3;
          output = 15;
          cacheRead = 0.3;
          cacheWrite = 3.75;
        };
      }
    ];

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
        pi = {
          enable = true;
          settings = {
            defaultProvider = "llm-gateway";
            defaultModel = "claude-opus-5";
            defaultThinkingLevel = "high";
            quietStartup = true;
            compaction.enabled = true;
            hideThinkingBlock = false;
            # Pi ships "dark" and "light" only; it has no Stylix target, so
            # follow the shared polarity rather than hardcoding a theme.
            theme =
              if config.stylix.polarity == "light"
              then "light"
              else "dark";
          };
          models.providers.llm-gateway = {
            baseUrl = "http://localhost:${toString gatewayPort}/v1";
            api = "openai-completions";
            # The gateway runs on loopback and ignores the key, but pi
            # requires the field to be present.
            apiKey = "1234567890";
            compat = {
              supportsDeveloperRole = true;
              supportsReasoningEffort = true;
              supportsUsageInStreaming = true;
            };
            models = gatewayModels;
          };
        };
        t3code = {
          enable = true;
          package =
            if pkgs.stdenv.isDarwin
            then inputs.t3code.packages.${system}.default
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
