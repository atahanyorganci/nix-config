{config, ...}: let
  catalog = config.flake.agentGateway;
in {
  flake.modules.homeManager.agents = {
    lib,
    config,
    pkgs,
    ...
  }: let
    # The agent gateway on mars, which serves the models under `/v1` and each
    # account's limits under `/_/usage`.
    gateway = catalog.url;

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
      // lib.optionalAttrs (cost != null) {cost = piCost cost;}
      // lib.optionalAttrs (compat != null) {inherit compat;};

    # Prices are USD per million tokens (`flake.agentGateway.models`): the base
    # rates, plus `tiers` that each take over above `inputTokensAbove`. Pi
    # takes the same shape, minus the rates and tiers a model does not have.
    piRates = lib.filterAttrs (_: rate: rate != null);
    piCost = cost:
      piRates (removeAttrs cost ["tiers"])
      // lib.optionalAttrs (cost.tiers != []) {tiers = map piRates cost.tiers;};

    # Models served through `ai.yorganci.dev`; the catalog also holds the ones
    # only the NetBird Agent Network endpoint offers.
    gatewayModels = lib.filter (model: lib.elem "pi" model.audience) catalog.models;

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
          # `fast` belongs to the profile, and `audience` to the catalog; pi's
          # model schema has neither.
          models = map (model: mkModel (removeAttrs model ["fast" "fastCostMultiplier" "audience"])) gatewayModels;
        };
      };
    };
  };
}
