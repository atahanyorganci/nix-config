{
  config,
  lib,
  ...
}: let
  inherit (lib) types mkOption;
  infra = config.flake.infra;

  allEfforts = ["none" "low" "medium" "high" "xhigh"];

  # USD per million tokens.
  rates = {
    input = mkOption {type = types.number;};
    output = mkOption {type = types.number;};
    cacheRead = mkOption {
      type = types.nullOr types.number;
      default = null;
    };
    cacheWrite = mkOption {
      type = types.nullOr types.number;
      default = null;
    };
  };

  costType = types.submodule {
    options =
      rates
      // {
        tiers = mkOption {
          type = types.listOf (types.submodule {
            options =
              rates
              // {
                inputTokensAbove = mkOption {
                  type = types.ints.positive;
                  description = "Prompt size at which these rates replace the base rates.";
                };
              };
          });
          default = [];
          description = "Prompt-size price breaks, each taking over above `inputTokensAbove`.";
        };
      };
  };

  modelType = types.submodule {
    options = {
      id = mkOption {
        type = types.str;
        description = "Model id the gateway serves, provider prefix included.";
      };
      name = mkOption {type = types.str;};
      contextWindow = mkOption {type = types.ints.positive;};
      maxTokens = mkOption {type = types.ints.positive;};
      efforts = mkOption {
        type = types.listOf (types.enum allEfforts);
        default = allEfforts;
        description = "Reasoning efforts the model accepts; empty for a model that does not reason.";
      };
      image = mkOption {
        type = types.bool;
        default = true;
        description = "Whether the model reads images.";
      };
      fast = mkOption {
        type = types.bool;
        default = false;
        description = "Whether `/v1/models` lists the `priority` service tier for the model.";
      };
      fastCostMultiplier = mkOption {
        type = types.number;
        default = 2;
        description = "How much more a `priority` request costs.";
      };
      cost = mkOption {
        type = types.nullOr costType;
        default = null;
      };
      audience = mkOption {
        type = types.listOf (types.enum ["pi" "agents"]);
        default = ["pi" "agents"];
        description = ''
          Who the model is offered to: `pi` lists it in pi through
          `ai.yorganci.dev`, `agents` serves it through the NetBird Agent
          Network endpoint. Both by default.
        '';
      };
    };
  };
in {
  options.flake.agentGateway = {
    url = mkOption {
      type = types.str;
      default = "https://ai.${infra.domain}";
      description = "The agent gateway on mars, serving the models under `/v1` and each account's limits under `/_/usage`.";
    };
    models = mkOption {
      type = types.listOf modelType;
      default = [];
      description = "Models the agent gateway serves, in the order clients list them.";
    };
  };

  config.flake.agentGateway.models = [
    {
      id = "codex/gpt-6-astra";
      name = "GPT-6-Astra";
      contextWindow = 1050000;
      maxTokens = 128000;
      efforts = lib.remove "none" allEfforts;
      fast = true;
      cost = {
        input = 10;
        output = 50;
        cacheRead = 1;
        cacheWrite = 12.5;
        tiers = [
          {
            inputTokensAbove = 272000;
            input = 20;
            output = 75;
            cacheRead = 2;
            cacheWrite = 25;
          }
        ];
      };
    }
    {
      id = "codex/gpt-6.1-sol";
      name = "GPT-6.1-Sol";
      contextWindow = 1050000;
      maxTokens = 128000;
      efforts = lib.remove "none" allEfforts;
      fast = true;
      cost = {
        input = 2;
        output = 10;
        cacheRead = 0.1;
        cacheWrite = 2.5;
        tiers = [
          {
            inputTokensAbove = 272000;
            input = 4;
            output = 15;
            cacheRead = 0.2;
            cacheWrite = 5;
          }
        ];
      };
    }
    {
      id = "codex/gpt-5.6-terra";
      name = "GPT-5.6-Terra";
      contextWindow = 1050000;
      maxTokens = 128000;
      fast = true;
      cost = {
        input = 2;
        output = 12;
        cacheRead = 0.2;
        cacheWrite = 2.5;
        tiers = [
          {
            inputTokensAbove = 272000;
            input = 4;
            output = 18;
            cacheRead = 0.4;
            cacheWrite = 5;
          }
        ];
      };
    }
    {
      id = "codex/gpt-6-luna";
      name = "GPT-6-Luna";
      contextWindow = 1050000;
      maxTokens = 128000;
      fast = true;
      cost = {
        input = 0.1;
        output = 0.5;
        cacheRead = 0.01;
        cacheWrite = 0.125;
        tiers = [
          {
            inputTokensAbove = 272000;
            input = 0.2;
            output = 0.75;
            cacheRead = 0.02;
            cacheWrite = 0.25;
          }
        ];
      };
    }
    {
      id = "claude-code/claude-fable-5-1";
      name = "Claude Fable 5.1";
      contextWindow = 1000000;
      maxTokens = 128000;
      cost = {
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
      cost = {
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
      cost = {
        input = 2;
        output = 10;
        cacheRead = 0.2;
        cacheWrite = 2.5;
      };
    }
  ];
}
