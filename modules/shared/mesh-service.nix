{...}: let
  module = {lib, ...}: {
    options.meshServices = lib.mkOption {
      type = lib.types.attrsOf (lib.types.submodule {
        options = {
          port = lib.mkOption {
            type = lib.types.port;
            description = "Port the service listens on.";
          };
          protocol = lib.mkOption {
            type = lib.types.enum ["tcp" "udp"];
            default = "tcp";
            description = "Transport protocol of the port.";
          };
          groups = lib.mkOption {
            type = lib.types.nonEmptyListOf lib.types.str;
            example = ["Admin"];
            description = "NetBird groups whose devices may connect to the port directly (Admin, Users, Servers).";
          };
        };
      });
      default = {};
      description = ''
        Services this host serves straight over the mesh, rather than through
        the reverse proxy. People's devices reach nothing else on a host
        directly: HTTP services go through the proxy (`httpServices`), and only
        SSH (Admin) and the mesh nameserver are open besides these. The
        HomeInfra stack turns each into an allow policy.
      '';
    };
  };
in {
  flake.modules.nixos.mesh-service = module;
  flake.modules.darwin.mesh-service = module;
}
