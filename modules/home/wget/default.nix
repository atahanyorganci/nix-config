{ pkgs
, lib
, config
, ...
}:
{
  options.wget.enable = lib.mkEnableOption "wget";
  config = lib.mkIf config.wget.enable {
    home.file."${config.xdg.configHome}/wgetrc".text = "";
    home.shellAliases.wget = "${pkgs.wget}/bin/wget --hsts-file=${config.xdg.cacheHome}/wget-hsts";
    home.sessionVariables.WGETRC = "${config.xdg.configHome}/wgetrc";
    home.packages = [ pkgs.wget ];
  };
}
