{ lib, config, pkgs, ... }:
{
  options.uutils.enable = lib.mkEnableOption "uutils";
  config = lib.mkIf config.uutils.enable {
    home.packages = [ pkgs.uutils-coreutils-noprefix ];
  };
}
