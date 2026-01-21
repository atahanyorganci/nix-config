{
  lib,
  config,
  ...
}: {
  options.jellyfin.enable = lib.mkEnableOption "Jellyfin";
  config = lib.mkIf config.jellyfin.enable {
    services.jellyfin = {
      enable = true;
    };
  };
}
