{ pkgs
, ...
}:
let
  monospace = pkgs.cascadia-code;
in
{
  fonts.packages = [ monospace ];
  stylix = {
    enable = true;
    base16Scheme = "${pkgs.base16-schemes}/share/themes/dracula.yaml";
    fonts = {
      monospace = {
        package = monospace;
        name = "Cascadia Code NF";
      };
    };
  };
}
