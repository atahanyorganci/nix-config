{
  lib,
  config,
  ...
}: {
  options.sonarr.enable = lib.mkEnableOption "Sonarr";
  config = lib.mkIf config.sonarr.enable {
    services.sonarr = {
      enable = true;
    };
  };
}
