{ pkgs
, lib
, config
, ...
}:
{
  options.pass.enable = lib.mkEnableOption "pass";
  config = lib.mkIf config.pass.enable {
    home.sessionVariables.PASSWORD_STORE_DIR = "${config.xdg.dataHome}/pass";
    home.packages = [ pkgs.pass pkgs.gopass ];
  };
}
