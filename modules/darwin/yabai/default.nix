{
  lib,
  config,
  ...
}: {
  options.yabai = {
    enable = lib.mkEnableOption "yabai";
    padding = lib.mkOption {
      type = lib.types.int;
      default = 4;
      description = "Padding between windows and the screen border.";
    };
  };
  config = lib.mkIf config.yabai.enable {
    services.yabai = {
      enable = true;
      enableScriptingAddition = true;
      config = {
        layout = "bsp";
        focus_follows_mouse = "autoraise";
        mouse_follows_focus = "on";
        window_placement = "second_child";
        auto_balance = "on";
        # Padding between windows
        window_gap = config.yabai.padding;
        top_padding = config.yabai.padding;
        bottom_padding = config.yabai.padding;
        left_padding = config.yabai.padding;
        right_padding = config.yabai.padding;
      };
    };
  };
}
