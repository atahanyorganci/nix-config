{ pkgs
, lib
, config
, ...
}:
{
  options.opencode.enable = lib.mkEnableOption "opencode";
  config = lib.mkIf config.opencode.enable {
    programs.opencode = {
      enable = true;
    };
  };
}
