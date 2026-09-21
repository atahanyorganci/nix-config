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
  in {
    options.agents.enable = lib.mkEnableOption "Agent harnesses";
    config = lib.mkIf config.agents.enable {
      programs.pi = {
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

        extensions = [
          {
            # Carries both the web_search tool and the usage widget; pi reads
            # the entry points from the package's own `pi` manifest.
            name = "yorganci";
            src = ../../packages/pi-extension;
          }
          {
            name = "context-budget";
            src = pkgs.fetchFromGitHub {
              owner = "magoz";
              repo = "pi-context-budget";
              rev = "b39f70e78217b25309439be22e603d8e4b9f5a01";
              sha256 = "sha256-fqfVsL4iTWA/RYJxLIAq8ZsMHkaVv+QzxOsR89KkqPU=";
            };
          }
        ];

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
