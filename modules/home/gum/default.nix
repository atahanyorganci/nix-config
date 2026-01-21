{
  pkgs,
  lib,
  ...
}: let
  aliases = {
    debug = "${pkgs.gum}/bin/gum log -t timeonly -l debug";
    info = "${pkgs.gum}/bin/gum log -t timeonly -l info";
    warn = "${pkgs.gum}/bin/gum log -t timeonly -l warn";
    error = "${pkgs.gum}/bin/gum log -t timeonly -l error";
    fatal = "${pkgs.gum}/bin/gum log -t timeonly -l fatal";
  };
in {
  options.gum = lib.mkEnableOption "gum";
  config = {
    home.shellAliases = aliases;
    home.packages = [pkgs.gum];
  };
}
