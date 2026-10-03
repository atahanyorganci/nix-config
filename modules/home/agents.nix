{
  flake.modules.homeManager.agents = {
    lib,
    config,
    pkgs,
    ...
  }: let
    # The agent gateway on mars, which serves the models under `/v1` and each
    # account's limits under `/_/usage`.
    gateway = "https://ai.yorganci.dev";

    allEfforts = ["none" "low" "medium" "high" "xhigh"];
    mkThinkingLevelMap = efforts:
      lib.mapAttrs (_: effort:
        if effort != null && lib.elem effort efforts
        then effort
        else null) {
        off = "none";
        minimal = null;
        low = "low";
        medium = "medium";
        high = "high";
        xhigh = "xhigh";
      };

    mkModel = {
      id,
      name,
      contextWindow,
      maxTokens,
      cost ? null,
      efforts ? allEfforts,
      image ? true,
      compat ? null,
    }: let
      reasoning = efforts != [];
    in
      {
        inherit id name reasoning contextWindow maxTokens;
        input = ["text"] ++ lib.optional image "image";
      }
      // lib.optionalAttrs reasoning {thinkingLevelMap = mkThinkingLevelMap efforts;}
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

    gatewayModels = [
      {
        id = "codex/gpt-6-astra";
        name = "GPT-6-Astra";
        contextWindow = 1050000;
        maxTokens = 128000;
        efforts = lib.remove "none" allEfforts;
        fast = true;
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
        id = "codex/gpt-6.1-sol";
        name = "GPT-6.1-Sol";
        contextWindow = 1050000;
        maxTokens = 128000;
        efforts = lib.remove "none" allEfforts;
        fast = true;
        cost = mkCost [
          {
            input = 2;
            output = 10;
            cacheRead = 0.1;
            cacheWrite = 2.5;
          }
          {
            inputTokensAbove = 272000;
            input = 4;
            output = 15;
            cacheRead = 0.2;
            cacheWrite = 5;
          }
        ];
      }
      {
        id = "codex/gpt-5.6-terra";
        name = "GPT-5.6-Terra";
        contextWindow = 1050000;
        maxTokens = 128000;
        fast = true;
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
        id = "codex/gpt-6-luna";
        name = "GPT-6-Luna";
        contextWindow = 1050000;
        maxTokens = 128000;
        fast = true;
        cost = mkCost [
          {
            input = 0.1;
            output = 0.5;
            cacheRead = 0.01;
            cacheWrite = 0.125;
          }
          {
            inputTokensAbove = 272000;
            input = 0.2;
            output = 0.75;
            cacheRead = 0.02;
            cacheWrite = 0.25;
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
        id = "claude-code/claude-opus-5-5";
        name = "Claude Opus 5.5";
        contextWindow = 1000000;
        maxTokens = 128000;
        fast = true;
        cost = mkCost {
          input = 4;
          output = 20;
          cacheRead = 0.2;
          cacheWrite = 5;
        };
      }
      {
        id = "claude-code/claude-sonnet-5-5";
        name = "Claude Sonnet 5.5";
        contextWindow = 1000000;
        maxTokens = 128000;
        cost = mkCost {
          input = 2;
          output = 10;
          cacheRead = 0.2;
          cacheWrite = 2.5;
        };
      }
    ];

    # A model-profile entry, built from the same spec as the model. The pi
    # module drops unset fields and empty entries, so a model with nothing to
    # configure writes nothing.
    #
    # Context profiles come from the price breaks: one capped at each
    # `inputTokensAbove` below the window, named by its size (`272k`), plus
    # `full`. Sessions start on the lowest, so pi compacts before a request
    # is billed at the next tier. A model with flat pricing gets no profiles.
    #
    # `fast` marks the models whose `/v1/models` entry lists the `priority`
    # service tier: while `/fast` is on, their requests ask for it, and
    # `fastCostMultiplier` is how much more those requests cost.
    mkProfile = {
      id,
      contextWindow,
      cost ? null,
      fast ? false,
      fastCostMultiplier ? 2,
      ...
    }: let
      breaks = lib.unique (lib.sort lib.lessThan (lib.catAttrs "inputTokensAbove" (cost.tiers or [])));
      unreachable = lib.filter (tokens: tokens >= contextWindow) breaks;
      name = tokens:
        if lib.mod tokens 1000 == 0
        then "${toString (tokens / 1000)}k"
        else toString tokens;
    in
      lib.throwIf (unreachable != [])
      "mkProfile: ${id} has price breaks at or above its ${toString contextWindow}-token window: ${toString unreachable}"
      {
        context = lib.mkIf (breaks != []) (lib.listToAttrs (map (tokens: lib.nameValuePair (name tokens) tokens) breaks) // {full = contextWindow;});
        defaultContext = lib.mkIf (breaks != []) (name (lib.head breaks));
        inherit fast;
        fastCostMultiplier = lib.mkIf fast fastCostMultiplier;
      };
  in {
    options.agents.enable = lib.mkEnableOption "Agent harnesses";
    config = lib.mkIf config.agents.enable {
      # The usage widget otherwise asks `localhost:3000`, where the gateway
      # used to run.
      home.sessionVariables.PI_USAGE_ENDPOINT = "${gateway}/_/usage";

      programs.pi = {
        enable = true;
        settings = {
          defaultProvider = "llm-gateway";
          defaultModel = "claude-code/claude-opus-5-5";
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
            name = "context7";
            src = "${pkgs.yorganci-pi-extension}/context7";
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

        modelProfiles.models = lib.listToAttrs (map (model: lib.nameValuePair "llm-gateway/${model.id}" (mkProfile model)) gatewayModels);

        models.providers.llm-gateway = {
          baseUrl = "${gateway}/v1";
          api = "openai-completions";
          # The gateway ignores the key (NetBird decides who reaches it), but
          # pi requires the field to be present.
          apiKey = "1234567890";
          compat = {
            supportsDeveloperRole = true;
            supportsReasoningEffort = true;
            supportsUsageInStreaming = true;
          };
          # `fast` belongs to the profile; pi's model schema has no such field.
          models = map (model: mkModel (removeAttrs model ["fast" "fastCostMultiplier"])) gatewayModels;
        };
      };
    };
  };
}
