{
  lib,
  config,
  ...
}: {
  options.prowlarr.enable = lib.mkEnableOption "Prowlarr";
  config = lib.mkIf config.prowlarr.enable {
    services.prowlarr = {
      enable = true;
    };
  };
}
