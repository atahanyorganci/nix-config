{
  config,
  lib,
  user,
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
          Enable Arr Stack services including:
          - Sonarr
          - Radarr
          - Prowlarr
          - Transmission
          - Jellyfin
          - Cloudflare Tunnel
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
      cloudflared = {
        enable = true;
        tunnels = {
          arr = {
            tokenFile = "/Users/${user.username}/.local/share/cloudflared/arr.token";
            logDir = "/Users/${user.username}/Library/Logs/cloudflared/arr";
          };
          media = {
            tokenFile = "/Users/${user.username}/.local/share/cloudflared/media.token";
            logDir = "/Users/${user.username}/Library/Logs/cloudflared/media";
          };
        };
      };
    };
  };
}
