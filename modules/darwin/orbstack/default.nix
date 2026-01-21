{
  config,
  lib,
  ...
}: {
  options.orbstack.enable = lib.mkEnableOption "OrbStack";
  config = lib.mkIf config.orbstack.enable {
    homebrew = {
      casks = [
        "orbstack"
      ];
    };
  };
}
