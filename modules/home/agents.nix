{
  flake.modules.homeManager.agents = {
    lib,
    config,
    pkgs,
    ...
  }: let
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
        id = "codex/gpt-5.6-terra";
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
        id = "codex/gpt-5.6-luna";
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
        id = "codex/gpt-5.6-sol";
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
        id = "codex/gpt-6-astra";
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
        id = "claude-code/claude-fable-5-1";
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
        id = "claude-code/claude-opus-5";
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
        id = "claude-code/claude-sonnet-5";
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
        id = "claude-code/claude-fable-5";
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
        id = "claude-code/claude-opus-4-8";
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
        id = "claude-code/claude-opus-4-7";
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
        id = "claude-code/claude-sonnet-4-6";
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
        id = "claude-code/claude-opus-4-6";
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
        id = "claude-code/claude-opus-4-5-20251101";
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
        id = "claude-code/claude-haiku-4-5-20251001";
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
        id = "claude-code/claude-sonnet-4-5-20250929";
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

    # Both the long-context OpenAI models and the Claude ones price a request
    # by its total input tokens, so a session that drifts past a tier boundary
    # silently costs multiples for every later turn. Capping the window makes
    # pi compact before that happens; `full` opts back in when the work
    # genuinely needs the room.
    #
    # Thresholds come from the `inputTokensAbove` tiers declared above, so the
    # budget and the price break stay the same number.
    shortContextTokens = 272000;

    # Fast mode targets for the models worth pairing. Keyed by primary model
    # id, so an entry that outlives its model fails the assertion below rather
    # than silently never applying.
    fastModels = {
      "claude-code/claude-opus-5" = "claude-code/claude-sonnet-5";
      "claude-code/claude-opus-4-8" = "claude-code/claude-sonnet-4-6";
      "claude-code/claude-sonnet-5" = "claude-code/claude-haiku-4-5-20251001";
      "codex/gpt-5.6-sol" = "codex/gpt-5.6-luna";
      "codex/gpt-6-astra" = "codex/gpt-5.6-terra";
    };

    # Derived from `gatewayModels` rather than written out again: a model that
    # gains a tier or changes its window updates both files at once.
    modelProfiles = lib.listToAttrs (lib.concatMap (
        model: let
          fast = fastModels.${model.id} or null;
          # Only models roomy enough for the cap to bite get a context axis;
          # below it `short` and `full` would be the same number.
          context = lib.optionalAttrs (model.contextWindow > shortContextTokens) {
            short = shortContextTokens;
            full = model.contextWindow;
          };
          profile =
            lib.optionalAttrs (context != {}) {
              inherit context;
              defaultContext = "short";
            }
            // lib.optionalAttrs (fast != null) {fast.model = fast;};
        in
          lib.optional (profile != {}) (lib.nameValuePair "llm-gateway/${model.id}" profile)
      )
      gatewayModels);
  in {
    options.agents.enable = lib.mkEnableOption "Agent harnesses";
    config = lib.mkIf config.agents.enable {
      # A fast target naming a model the gateway does not serve would only
      # surface as a warning at session start, long after the typo.
      assertions = let
        ids = map (model: model.id) gatewayModels;
        missing = lib.filter (target: !(lib.elem target ids)) (lib.attrValues fastModels);
      in [
        {
          assertion = missing == [];
          message = "agents: fast-mode targets not served by llm-gateway: ${lib.concatStringsSep ", " missing}.";
        }
      ];

      programs.pi = {
        enable = true;
        settings = {
          defaultProvider = "llm-gateway";
          defaultModel = "claude-code/claude-opus-5";
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

        # fetch-content shells out to all four: ImageMagick to validate and
        # downscale images, poppler to pull figures out of PDFs, gh to read
        # GitHub through the API instead of its rendered pages, and ffmpeg to
        # turn the HLS manifests and split video/audio streams that cobalt
        # resolves into single playable files. Putting them on pi's PATH rather
        # than depending on the user's profile keeps the extension working
        # regardless of what is installed globally.
        extraPackages = [pkgs.imagemagick pkgs.poppler-utils pkgs.gh pkgs.ffmpeg];

        extensions = [
          # Each bundle is a directory holding a single self-contained
          # index.js, so they are pointed at individually rather than through
          # the package's `pi` manifest.
          {
            name = "web-search";
            src = "${pkgs.yorganci-pi-extension}/web-search";
          }
          {
            name = "fetch-content";
            src = "${pkgs.yorganci-pi-extension}/fetch-content";
          }
          {
            name = "usage";
            src = "${pkgs.yorganci-pi-extension}/usage";
          }
          {
            name = "model-profile";
            src = "${pkgs.yorganci-pi-extension}/model-profile";
          }
        ];

        modelProfiles.models = modelProfiles;

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
    };
  };
}
