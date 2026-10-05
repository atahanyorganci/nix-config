{
  config,
  lib,
  ...
}: let
  inherit (lib) types mkOption;
  infra = config.flake.infra;
  catalog = lib.listToAttrs (map (model: lib.nameValuePair model.id model) config.flake.agentGateway.models);

  # Groups a policy may authorise. Unlike mesh policies, `Agents` is allowed:
  # an Agent Network policy only opens the proxy peer on 80/443, never other
  # peers. `All` would include the proxy's own peers.
  sourceGroup = types.enum ["Admin" "Users" "Servers" "Agents"];

  window = mkOption {
    type = types.ints.between 60 31536000;
    description = "Seconds after which the counters reset.";
  };

  # A model as the stack reads it: its id and catalog prices (USD per million
  # tokens), which the stack converts to NetBird's per-1k rates.
  resolveModel = provider: id: let
    model =
      catalog.${id}
      or (throw "agentNetworkProviders.${provider}: ${id} is not in flake.agentGateway.models");
  in
    lib.throwIf (model.cost == null)
    "agentNetworkProviders.${provider}: ${id} has no cost in flake.agentGateway.models, so NetBird would meter it at $0"
    {inherit (model) id cost;};

  allSystems = config.flake.nixosConfigurations // config.flake.darwinConfigurations;

  declared = lib.concatLists (lib.mapAttrsToList (host: system:
    lib.mapAttrsToList (name: provider: {inherit host name provider;})
    (system.config.agentNetworkProviders or {}))
  allSystems);

  duplicates = let
    names = map (entry: entry.name) declared;
  in
    lib.unique (lib.filter (name: lib.count (other: other == name) names > 1) names);

  providers =
    lib.throwIf (duplicates != [])
    "flake.agentNetwork.providers: ${lib.concatStringsSep ", " duplicates} declared by more than one host"
    (lib.listToAttrs (map ({
      host,
      name,
      provider,
    }:
      lib.nameValuePair name {
        inherit host;
        inherit (provider) catalogId upstreamUrl;
        models = map (resolveModel name) provider.models;
      })
    declared));
in {
  options.flake.agentNetwork = mkOption {
    description = ''
      NetBird Agent Network: the account's keyless LLM endpoint, the providers
      behind it and who may call them. `packages/stack` applies it.
    '';
    type = types.submodule {
      options = {
        enable = lib.mkEnableOption "the NetBird Agent Network";

        gateway = {
          proxyAddress = mkOption {
            type = types.str;
            default = infra.domain;
            description = ''
              Proxy cluster the endpoint is allocated under. NetBird picks the
              label, so the endpoint reads `<adjective>-<noun>.<proxyAddress>`.
            '';
          };
          endpoint = mkOption {
            type = types.nullOr types.str;
            default = null;
            example = "brave-otter.yorganci.dev";
            description = ''
              The endpoint NetBird allocated, pinned after the first deploy so
              clients can be configured with it. The stack fails when the live
              endpoint differs. Null until then, which leaves clients alone.
            '';
          };
          logCollection = mkOption {
            type = types.bool;
            default = true;
            description = "Keep a full access-log row per request; captured prompts are stored only while this is on.";
          };
          promptCollection = mkOption {
            type = types.bool;
            default = false;
            description = "Capture prompts and completions into the access log.";
          };
          redactPii = mkOption {
            type = types.bool;
            default = false;
            description = "Redact PII from captured prompts.";
          };
          accessLogRetentionDays = mkOption {
            type = types.int;
            default = 30;
            description = "Days to keep access-log rows; 0 or less keeps them forever.";
          };
        };

        providers = mkOption {
          type = types.attrsOf types.raw;
          readOnly = true;
          default = providers;
          defaultText = lib.literalMD "collected from every host's `agentNetworkProviders`";
          description = "Providers declared by hosts through `agentNetworkProviders`, with their models priced from the catalog.";
        };

        guardrails = mkOption {
          default = {};
          description = "Checks a policy applies to the requests it authorises, keyed by name.";
          type = types.attrsOf (types.submodule {
            options = {
              description = mkOption {
                type = types.str;
                default = "";
              };
              modelAllowlist = mkOption {
                type = types.nullOr (types.listOf types.str);
                default = null;
                description = "Models callers may request; null turns the check off.";
              };
              promptCapture = mkOption {
                type = types.nullOr (types.submodule {
                  options.redactPii = mkOption {
                    type = types.bool;
                    default = false;
                  };
                });
                default = null;
                description = "Capture prompts and completions; null turns the check off. `gateway.promptCollection` is the master switch.";
              };
            };
          });
        };

        policies = mkOption {
          default = {};
          description = "Who may call which providers, keyed by name. NetBird refuses every request no policy allows.";
          type = types.attrsOf (types.submodule {
            options = {
              description = mkOption {
                type = types.str;
                default = "";
              };
              enabled = mkOption {
                type = types.bool;
                default = true;
              };
              sourceGroups = mkOption {
                type = types.nonEmptyListOf sourceGroup;
                description = "NetBird groups whose users and peers may call the providers.";
              };
              providers = mkOption {
                type = types.nonEmptyListOf types.str;
                description = "Names of `providers` the groups may call.";
              };
              guardrails = mkOption {
                type = types.listOf types.str;
                default = [];
                description = "Names of `guardrails` applied to the requests this policy authorises.";
              };
              limits = {
                tokens = mkOption {
                  default = null;
                  description = "Token cap; null leaves tokens uncapped.";
                  type = types.nullOr (types.submodule {
                    options = {
                      groupCap = mkOption {
                        type = types.ints.unsigned;
                        default = 0;
                        description = "Tokens per source group and window; 0 is uncapped.";
                      };
                      userCap = mkOption {
                        type = types.ints.unsigned;
                        default = 0;
                        description = "Tokens per user and window; 0 is uncapped.";
                      };
                      windowSeconds = window;
                    };
                  });
                };
                budget = mkOption {
                  default = null;
                  description = "Spend cap in USD, priced from the providers' models; null leaves spend uncapped.";
                  type = types.nullOr (types.submodule {
                    options = {
                      groupCapUsd = mkOption {
                        type = types.number;
                        default = 0;
                      };
                      userCapUsd = mkOption {
                        type = types.number;
                        default = 0;
                      };
                      windowSeconds = window;
                    };
                  });
                };
              };
            };
          });
        };
      };
    };
  };

  config.flake.agentNetwork = {
    enable = true;
    gateway = {
      logCollection = true;
      promptCollection = true;
      redactPii = false;
      accessLogRetentionDays = 30;
    };
    # Not a cap. NetBird 0.80 captures on `gateway.promptCollection` alone, but
    # its docs require a guardrail as well; this keeps capture on either way.
    guardrails.capture-prompts = {
      description = "Capture prompts and completions into the access log";
      promptCapture = {};
    };
    # Separate policies, so a cap can later go on one without the other. The
    # provider's model list is the allowlist for both.
    policies = {
      users = {
        description = "Every user, uncapped";
        sourceGroups = ["Admin" "Users"];
        providers = ["agent-gateway"];
        guardrails = ["capture-prompts"];
      };
      agents = {
        description = "Agent hosts such as jupiter (Hermes), uncapped";
        sourceGroups = ["Agents"];
        providers = ["agent-gateway"];
        guardrails = ["capture-prompts"];
      };
    };
  };
}
