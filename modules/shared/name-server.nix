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
          groups = lib.mkOption {
            type = lib.types.listOf lib.types.str;
            default = ["All"];
            description = "NetBird distribution group *names* (resolved to IDs at deploy time).";
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
