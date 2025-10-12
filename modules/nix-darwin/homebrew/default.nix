{ lib, config, ... }:
let
  casks = config.homebrew.casks;
  masApps = config.homebrew.masApps or { };
  enabled = builtins.length casks > 0 || builtins.length (lib.attrNames masApps) > 0;
in
{
  config = {
    homebrew = lib.mkIf enabled {
      enable = true;
      caskArgs.no_quarantine = true;
      onActivation = {
        cleanup = "zap";
        upgrade = true;
      };
    };
  };
}
