{
  flake.modules.homeManager.git = {lib, ...}: {
    options.git.enable = lib.mkEnableOption "git";
  };
}
