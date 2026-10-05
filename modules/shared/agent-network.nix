{...}: let
  module = {lib, ...}: {
    options.agentNetworkProviders = lib.mkOption {
      type = lib.types.attrsOf (lib.types.submodule {
        options = {
          catalogId = lib.mkOption {
            type = lib.types.str;
            example = "agentgateway";
            description = ''
              NetBird catalog entry naming the provider type. It decides the
              auth header NetBird injects and the identity headers it stamps
              on upstream requests.
            '';
          };
          upstreamUrl = lib.mkOption {
            type = lib.types.strMatching "https?://[^/]+";
            example = "http://127.0.0.1:3000";
            description = ''
              Origin the NetBird proxy forwards to, without a path: the proxy
              appends the request path (`/v1/…`) itself. The proxy dials it
              from its own host, so a loopback origin only works on a host
              that runs `netbird-proxy`.
            '';
          };
          models = lib.mkOption {
            type = lib.types.listOf lib.types.str;
            default = [];
            description = ''
              Ids from `flake.agentGateway.models` routed to this provider,
              priced from that catalog. Requests for any other model are
              refused.
            '';
          };
        };
      });
      default = {};
      description = ''
        NetBird Agent Network providers served from this host, keyed by the
        provider's name. Collected into `flake.agentNetwork.providers`.
      '';
    };
  };
in {
  flake.modules.nixos.agent-network = module;
  flake.modules.darwin.agent-network = module;
}
