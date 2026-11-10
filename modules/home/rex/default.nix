{
  flake.modules.homeManager.rex = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.rex;
    configDir = ./config;
  in {
    options.rex = {
      enable = lib.mkEnableOption "Rex terminal configuration";
    };
    config = lib.mkIf cfg.enable {
      xdg.configFile."rex" = {
        enable = true;
        recursive = true;
        source = configDir;
      };
    };
  };
}
