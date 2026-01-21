{
  lib,
  config,
  pkgs,
  ...
}: {
  options.gnome = {
    enable = lib.mkEnableOption "Gnome desktop environment";
    layout = lib.mkOption {
      type = lib.types.str;
      description = "Keyboard layout";
    };
    variant = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "Keyboard variant";
    };
  };
  config = lib.mkIf config.gnome.enable {
    # Gnome Desktop
    services.xserver = {
      enable = true;
      displayManager.gdm.enable = true;
      desktopManager.gnome.enable = true;
      # Configure keymap in X11
      xkb = {
        inherit (config.gnome) layout variant;
      };
    };
    # Remove Gnome default applications
    environment.gnome.excludePackages = with pkgs; [
      gnome-photos
      gnome-tour
      gnome-calendar
      gnome-weather
      gnome-contacts
      gnome-maps
      gedit
      gnome-music
      epiphany
      geary
      gnome-characters
      totem
      yelp
    ];
  };
}
