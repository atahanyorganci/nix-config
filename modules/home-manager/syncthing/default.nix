{ lib
, config
, ...
}:
{
  options.syncthing.enable = lib.mkEnableOption "Syncthing";
  config = lib.mkIf config.syncthing.enable {
    services.syncthing.enable = true;
  };
}
