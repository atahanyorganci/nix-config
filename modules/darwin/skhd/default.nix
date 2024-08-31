{
  lib,
  config,
  pkgs,
  ...
}: {
  options.skhd.enable = lib.mkEnableOption "skhd";
  config = lib.mkIf config.skhd.enable {
    services.skhd = {
      enable = true;
      package = pkgs.skhd;
      skhdConfig = builtins.readFile ./skhdrc;
    };
  };
}
