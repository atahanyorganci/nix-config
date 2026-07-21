{...}: let
  module = {lib, ...}: {
    options.httpServices = lib.mkOption {
      type = lib.types.attrsOf (lib.types.submodule {
        options = {
          port = lib.mkOption {
            type = lib.types.port;
            description = "Primary HTTP listen port";
          };
          protocol = lib.mkOption {
            type = lib.types.enum ["http" "https"];
            default = "http";
            description = "Upstream protocol";
          };
          expose = lib.mkOption {
            type = lib.types.submodule {
              options = {
                enable = lib.mkEnableOption "reverse proxy exposure";
                private = lib.mkOption {
                  type = lib.types.bool;
                  default = true;
                  description = "Restrict to NetBird mesh clients when true";
                };
                accessGroups = lib.mkOption {
                  type = lib.types.listOf lib.types.str;
                  default = [];
                  description = "NetBird group IDs; empty uses stack default (All group)";
                };
              };
            };
            default = {};
          };
          auth = lib.mkOption {
            type = lib.types.submodule {
              options = {
                type = lib.mkOption {
                  type = lib.types.enum [
                    "none"
                    "bearer"
                    "link"
                    "password"
                    "pin"
                    "header"
                  ];
                  default = "none";
                  description = "Reverse-proxy authentication mode";
                };
                distributionGroups = lib.mkOption {
                  type = lib.types.listOf lib.types.str;
                  default = [];
                  description = "NetBird distribution groups for bearer/OIDC auth";
                };
                passwordFile = lib.mkOption {
                  type = lib.types.nullOr lib.types.path;
                  default = null;
                  description = "Plaintext password file consumed by ExposeServices stack";
                };
                pin = lib.mkOption {
                  type = lib.types.nullOr lib.types.str;
                  default = null;
                  description = "PIN value for proxy pin auth";
                };
                headers = lib.mkOption {
                  type = lib.types.listOf (lib.types.submodule {
                    options = {
                      header = lib.mkOption {type = lib.types.str;};
                      value = lib.mkOption {type = lib.types.str;};
                    };
                  });
                  default = [];
                  description = "Required header name/value pairs";
                };
              };
            };
            default = {type = "none";};
          };
        };
      });
      default = {};
      description = "HTTP services exposed by this host for flake-level aggregation";
    };
  };
in {
  flake.modules.nixos.http-service = module;
  flake.modules.darwin.http-service = module;
}
