{ lib
, config
, user
, pkgs
, ...
}:
let
  shell = pkgs.${user.shell};
  shellBin = "${shell}/bin/${user.shell}";
in
{
  options.alacritty = {
    enable = lib.mkEnableOption "Alacritty Terminal";
  };
  config = lib.mkIf config.alacritty.enable {
    programs.alacritty = {
      enable = true;
      settings = {
        terminal.shell = {
          args = [ "-l" ];
          program = shellBin;
        };
        font = {
          size = lib.mkForce config.terminal.font.size;
        };
        window = {
          decorations = "Full";
          dimensions = config.terminal.dimensions;
          padding = config.terminal.padding;
          position = config.terminal.position;
        };
      };
    };
  };
}
