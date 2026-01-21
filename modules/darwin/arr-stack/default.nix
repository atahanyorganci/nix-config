{ config
, lib
, ...
}:
{
  options.arr-stack.enable = lib.mkEnableOption "Arr Stack" // {
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
  config = lib.mkIf config.arr-stack.enable {
    services = {
      sonarr.enable = true;
      radarr.enable = true;
      prowlarr.enable = true;
      transmission.enable = true;
      jellyfin.enable = true;
    };
  };
}
