{
  pkgs,
  lib,
  config,
  ...
}: let
  versions = {
    "20" = pkgs.nodejs_20;
    "22" = pkgs.nodejs_22;
    "24" = pkgs.nodejs_24;
    "26" = pkgs.nodejs_26;
  };
  availableVersions = builtins.attrNames versions;
  sortedVersions = builtins.sort (a: b: (builtins.compareVersions a b) < 0) availableVersions;
  latestVersion = builtins.elemAt sortedVersions (builtins.length sortedVersions - 1);
  node = versions.${config.node.version};
  corepackHome = "${config.xdg.dataHome}/corepack";
in {
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
      COREPACK_HOME = corepackHome;
    };
    home.sessionPath = [corepackHome];
    home.packages = [node];
  };
}
