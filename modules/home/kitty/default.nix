{ lib, config, ... }:
{
  options.kitty.enable = lib.mkEnableOption "Kitty terminal emulator";
  config.programs.kitty = lib.mkIf config.kitty.enable {
    enable = config.kitty.enable;
    font = {
      size = 12;
    };
    settings = {
      confirm_os_window_close = 0;
      remember_window_size = false;
      initial_window_width = 900;
      initial_window_height = 800;
    };
    keybindings = {
      "ctrl+t" = "new_tab";
      "ctrl+w" = "close_tab";
      "ctrl+shift+1" = "goto_tab 1";
      "ctrl+shift+2" = "goto_tab 2";
      "ctrl+shift+3" = "goto_tab 3";
      "ctrl+shift+4" = "goto_tab 4";
      "ctrl+shift+5" = "goto_tab 5";
      "ctrl+shift+6" = "goto_tab 6";
      "ctrl+shift+7" = "goto_tab 7";
      "ctrl+shift+8" = "goto_tab 8";
      "ctrl+shift+9" = "goto_tab 9";
    };
  };
}
