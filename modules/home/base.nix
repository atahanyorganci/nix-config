{
  flake.modules.homeManager.base = {
    home.stateVersion = "26.05";
    programs.home-manager.enable = true;
    programs.man = {
      enable = false;
      man-db.enable = false;
    };
    xdg.enable = true;
  };
}
