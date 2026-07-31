{
  flake.modules.nixos.usb = {
    lib,
    config,
    user,
    ...
  }: {
    options.usb.enable = lib.mkEnableOption "udev rules and group access for all USB devices";

    config = lib.mkIf config.usb.enable {
      users.groups.plugdev = {};
      users.users.${user.username}.extraGroups = ["plugdev"];

      services.udev.extraRules = ''
        SUBSYSTEM=="usb", MODE="0660", GROUP="plugdev", TAG+="uaccess"
      '';
    };
  };
}
