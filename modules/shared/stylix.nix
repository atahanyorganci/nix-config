{...}: let
  stylix = {pkgs, ...}: let
    monospace = pkgs.cascadia-code;
  in {
    fonts.packages = [monospace];
    stylix = {
      enable = true;
      polarity = "dark";
      base16Scheme = ./cursor-dark.yaml;
      fonts = {
        monospace = {
          package = monospace;
          name = "Cascadia Code NF";
        };
      };
    };
  };
in {
  flake.modules.nixos.stylix = stylix;
  flake.modules.darwin.stylix = stylix;
}
