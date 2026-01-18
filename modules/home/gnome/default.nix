{ lib, config, ... }:
{
  options.gnome.enable = lib.mkEnableOption "Gnome desktop environment";
  config = lib.mkIf config.gnome.enable {
    dconf = {
      enable = true;
      settings."org/gnome/desktop/interface".color-scheme = lib.mkForce "prefer-dark";
    };
  };
}
