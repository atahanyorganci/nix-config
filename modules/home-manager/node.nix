{ pkgs
, lib
, config
, ...
}:
let
  versions = {
    "18" = pkgs.nodejs_18;
    "20" = pkgs.nodejs_20;
    "22" = pkgs.nodejs_22;
  };
  availableVersions = builtins.attrNames versions;
  sortedVersions = builtins.sort (a: b: (builtins.compareVersions a b) < 0) availableVersions;
  latestVersion = builtins.elemAt sortedVersions (builtins.length sortedVersions - 1);
  node = versions.${config.node.version};
  corepackHome = "${config.xdg.dataHome}/corepack";
in
{
  options.node = {
    enable = lib.mkEnableOption "Node.js";
    version = lib.mkOption {
      type = lib.types.enum sortedVersions;
      default = latestVersion;
      description = "The version of Node.js to install.";
    };
  };
  config = lib.mkIf config.node.enable {
    home.sessionVariables = {
      NODE_REPL_HISTORY = "${config.xdg.stateHome}/node_repl_history";
      NPM_CONFIG_USERCONFIG = "${config.xdg.configHome}/npm/npmrc";
      COREPACK_HOME = corepackHome;
    };
    home.file = {
      "${config.xdg.configHome}/npm/npmrc".text = ''
        prefix=${config.xdg.dataHome}/npm
        cache=${config.xdg.cacheHome}/npm
        init-module=${config.xdg.configHome}/npm/config/npm-init.js
        logs-dir=${config.xdg.stateHome}/npm/logs
      '';
    };
    home.sessionPath = [ corepackHome ];
    home.packages = [ node ];
  };
}
