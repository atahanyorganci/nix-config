{
  config,
  lib,
  ...
}: let
  cfg = config.arr-stack;
  inherit
    (lib)
    mkEnableOption
    mkOption
    types
    mkIf
    ;
in {
  options.arr-stack = {
    enable =
      mkEnableOption "Arr Stack"
      // {
        description = ''
          Whether to enable the Arr Stack, a collection of services for managing media libraries.
          Arr Stack includes:
          - Sonarr
          - Radarr
          - Prowlarr
          - Transmission
          - Jellyfin
        '';
      };
    domain = mkOption {
      type = types.str;
      description = "The domain name for the Arr Stack.";
      example = "yorganci.dev";
    };
  };
  config = mkIf cfg.enable {
    services = {
      sonarr.enable = true;
      radarr.enable = true;
      prowlarr.enable = true;
      transmission = {
        enable = true;
        settings = {
          rpc-host-whitelist-enabled = true;
          rpc-host-whitelist = "download.${cfg.domain}";
        };
      };
      jellyfin.enable = true;
    };
  };
}
