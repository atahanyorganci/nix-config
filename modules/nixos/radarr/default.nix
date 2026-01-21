{
  lib,
  config,
  ...
}: {
  options.radarr.enable = lib.mkEnableOption "Radarr";
  config = lib.mkIf config.radarr.enable {
    services.radarr = {
      enable = true;
    };
  };
}
