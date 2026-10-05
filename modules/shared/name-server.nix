{...}: let
  module = {lib, ...}: {
    options.nameServers = lib.mkOption {
      type = lib.types.attrsOf (lib.types.submodule {
        options = {
          description = lib.mkOption {
            type = lib.types.str;
            default = "";
            description = "Human-readable description for the NetBird nameserver group.";
          };
          enabled = lib.mkOption {
            type = lib.types.bool;
            default = true;
          };
          primary = lib.mkOption {
            type = lib.types.bool;
            default = false;
            description = "Primary resolver for all non-NetBird queries; requires empty domains.";
          };
          port = lib.mkOption {
            type = lib.types.port;
            default = 53;
          };
          fallbacks = lib.mkOption {
            type = lib.types.listOf lib.types.str;
            default = [];
            example = ["1.1.1.1"];
            description = ''
              IPv4 resolvers (port 53) listed after this peer in the same NetBird
              nameserver group. NetBird tries a group's servers in order and moves on
              only on timeout, SERVFAIL or REFUSED, so a blocked answer from this peer
              still stands. Separate primary groups would instead be raced, with the
              fastest answer winning. NetBird caps a group at three servers, so at
              most two fallbacks.
            '';
          };
          groups = lib.mkOption {
            type = lib.types.listOf lib.types.str;
            default = ["Admin" "Users" "Servers"];
            description = ''
              NetBird distribution group names (Admin, Users, Servers), resolved to IDs at
              deploy time. The stack allows exactly these groups to reach the resolver, so
              Agents and All are rejected: Agents peers are isolated.
            '';
          };
          domains = lib.mkOption {
            type = lib.types.listOf lib.types.str;
            default = [];
            description = "Match domains for split-horizon DNS; must be empty when primary.";
          };
          searchDomainsEnabled = lib.mkOption {
            type = lib.types.bool;
            default = false;
          };
        };
      });
      default = {};
      description = "NetBird nameserver groups hosted by this peer (IP = overlay address).";
    };
  };
in {
  flake.modules.nixos.name-server = module;
  flake.modules.darwin.name-server = module;
}
