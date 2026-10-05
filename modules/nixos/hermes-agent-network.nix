{config, ...}: let
  flakeConfig = config.flake;
in {
  flake.modules.nixos.hermes-agent-network = {
    lib,
    config,
    ...
  }: let
    hermesCfg = config.services.hermes-agent;
    cfg = hermesCfg.agentNetwork;

    # Models the NetBird Agent Network endpoint offers (`audience` includes
    # "agents"); NetBird refuses any other.
    agentModels = lib.filter (model: lib.elem "agents" model.audience) flakeConfig.agentGateway.models;
    agentModelIds = map (model: model.id) agentModels;

    # The context Hermes compacts at: the first price break, so a turn is not
    # billed at the next tier (as pi's default profile does), else the window.
    contextLength = model: let
      breaks = lib.sort lib.lessThan (map (tier: tier.inputTokensAbove) (
        if model.cost == null
        then []
        else model.cost.tiers
      ));
    in
      if breaks != []
      then lib.head breaks
      else model.contextWindow;

    modelSettings = model:
      {context_length = contextLength model;}
      // lib.optionalAttrs model.image {supports_vision = true;};

    defaultModel = lib.findFirst (model: model.id == cfg.model) null agentModels;
    baseUrl = "https://${cfg.endpoint}/v1";

    # Gives every offered model its context length, which the gateway's
    # `/v1/models` does not report, and `/model custom:netbird:<id>`.
    netbirdProvider =
      {
        name = "netbird";
        base_url = baseUrl;
        api_mode = "chat_completions";
        models = lib.listToAttrs (map (model: lib.nameValuePair model.id (modelSettings model)) agentModels);
      }
      # Hermes only sends a reasoning effort to endpoints it knows (OpenRouter,
      # Nous, LM Studio, …), so `agent.reasoning_effort` alone never reaches a
      # custom one. A provider's `extra_body` is merged into every request to
      # its base URL, and the gateway reads OpenAI's top-level
      # `reasoning_effort`.
      // lib.optionalAttrs (cfg.effort != null) {
        extra_body.reasoning_effort = cfg.effort;
      };

    # Every auxiliary task of the pinned Hermes. They default to `auto`, which
    # picks whichever provider key is left in `.env`, bypassing the gateway;
    # `main` sends them to the same endpoint as the agent. Recheck the list
    # (`auxiliary` in hermes_cli/config.py) when bumping `hermes-agent`.
    auxiliaryTasks = [
      "approval"
      "background_review"
      "compression"
      "curator"
      "goal_judge"
      "kanban_decomposer"
      "mcp"
      "memory_query_rewrite"
      "moa_aggregator"
      "moa_reference"
      "monitor"
      "profile_describer"
      "skills_hub"
      "title_generation"
      "triage_specifier"
      "tts_audio_tags"
      "vision"
      "web_extract"
    ];
  in {
    options.services.hermes-agent.agentNetwork = {
      enable = lib.mkEnableOption ''
        routing every LLM call Hermes makes through the NetBird Agent Network
        endpoint, which reaches the agent gateway on mars. NetBird authorises
        the host by its peer groups (an `agentNetwork` policy has to cover
        them) and injects the upstream credential, so Hermes holds no provider
        key
      '';

      endpoint = lib.mkOption {
        type = lib.types.nullOr lib.types.str;
        default = flakeConfig.agentNetwork.gateway.endpoint;
        defaultText = lib.literalExpression "flake.agentNetwork.gateway.endpoint";
        description = ''
          Agent Network endpoint hostname. Null until the endpoint NetBird
          allocated is pinned, and until then Hermes is left as it is.
        '';
      };

      model = lib.mkOption {
        type = lib.types.str;
        default = "codex/gpt-6-luna";
        description = "Model Hermes uses by default; one of the models the endpoint offers.";
      };

      effort = lib.mkOption {
        type = lib.types.nullOr (lib.types.enum ["none" "low" "medium" "high" "xhigh"]);
        default = null;
        example = "medium";
        description = ''
          Reasoning effort sent with every request to the endpoint, whichever
          model serves it; one the default model accepts. Null leaves it to
          the gateway and the model's own default.
        '';
      };
    };

    config = lib.mkIf (hermesCfg.enable && cfg.enable) (lib.mkMerge [
      {
        assertions = [
          {
            assertion = lib.elem cfg.model agentModelIds;
            message = ''
              services.hermes-agent.agentNetwork.model = "${cfg.model}" is not offered through the
              Agent Network endpoint. Offered: ${lib.concatStringsSep ", " agentModelIds}.
              Add "agents" to its audience in flake.agentGateway.models.
            '';
          }
          {
            assertion = cfg.effort == null || defaultModel == null || lib.elem cfg.effort defaultModel.efforts;
            message = ''
              services.hermes-agent.agentNetwork.effort = "${toString cfg.effort}" is not an effort
              ${cfg.model} accepts: ${lib.concatStringsSep ", " (defaultModel.efforts or [])}.
            '';
          }
        ];

        warnings = lib.optional (cfg.endpoint == null) ''
          services.hermes-agent.agentNetwork is enabled, but flake.agentNetwork.gateway.endpoint
          is not pinned yet, so Hermes keeps its current provider. Deploy the HomeInfra stack and
          pin the endpoint it reports.
        '';
      }

      (lib.mkIf (cfg.endpoint != null && defaultModel != null) {
        # The Hermes module merges these into the existing config.yaml and
        # keeps any key it does not set, so every key that could still point
        # Hermes at a provider directly is set here.
        services.hermes-agent.settings = {
          model =
            {
              provider = "custom";
              base_url = baseUrl;
              # The proxy strips it and injects the provider's own; Hermes
              # just has to send something.
              api_key = "netbird";
              default = cfg.model;
            }
            // modelSettings defaultModel;
          custom_providers = [netbirdProvider];
          auxiliary = lib.genAttrs auxiliaryTasks (_: {provider = "main";});
          fallback_providers = [];
        };

        # The endpoint resolves (through NetBird's DNS) and answers only over
        # the mesh.
        systemd.services.hermes-agent = lib.mkIf config.netbird.enable {
          after = ["netbird-wt0.service"];
          wants = ["netbird-wt0.service"];
        };
      })

      # Kept in Hermes's own settings too, though only `extra_body` reaches the
      # endpoint (see `netbirdProvider`). A definition of its own: `settings`
      # merges plain attrsets, so an `mkIf` inside one would not be resolved.
      (lib.mkIf (cfg.endpoint != null && defaultModel != null && cfg.effort != null) {
        services.hermes-agent.settings.agent.reasoning_effort = cfg.effort;
      })
    ]);
  };
}
