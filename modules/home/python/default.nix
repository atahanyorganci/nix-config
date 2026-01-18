{ pkgs
, lib
, config
, ...
}:
let
  versions = {
    "3.9" = pkgs.python39;
    "3.10" = pkgs.python310;
    "3.11" = pkgs.python311;
    "3.12" = pkgs.python312;
    "3.13" = pkgs.python313;
  };
  availableVersions = builtins.attrNames versions;
  sortedVersions = builtins.sort (a: b: (builtins.compareVersions a b) < 0) availableVersions;
  latestVersion = builtins.elemAt sortedVersions (builtins.length sortedVersions - 1);
  python = versions.${config.python.version};
in
{
  options.python = {
    enable = lib.mkEnableOption "Python";
    version = lib.mkOption {
      type = lib.types.enum sortedVersions;
      default = latestVersion;
      description = "The version of Python to install.";
    };
  };
  config = lib.mkIf config.python.enable {
    home.sessionVariables = {
      PYTHONSTARTUP = "${config.xdg.configHome}/python/startup.py";
      PYTHONHISTFILE = "${config.xdg.cacheHome}/python/history.py";
    };
    home.packages = [ python pkgs.uv ];
    home.file = {
      ".config/ipython/profile_default/ipython_config.py" = {
        enable = true;
        source = ./ipython/profile_deafult/ipython_config.py;
      };
      ".config/python/startup.py" = {
        enable = true;
        source = ./python/startup.py;
      };
    };
  };
}
